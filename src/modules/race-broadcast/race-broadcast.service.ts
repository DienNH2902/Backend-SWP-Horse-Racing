import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  RaceBroadcastGateway,
  RaceTickFrame,
  RaceEventFrame,
} from './gateway/race-broadcast.gateway';
import { RaceTickRepository } from '../race-simulation/repositories/race-tick.repository';
import { RaceEventRepository } from '../race-simulation/repositories/race-event.repository';
import { RawResultRepository } from '../race-simulation/repositories/raw-result.repository';
import { RaceRepository } from '../race/race.repository';
import { RaceStatusEnum } from 'src/constants/raceStatus.enum';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
import { InjectModel } from '@nestjs/mongoose';
import { SpectatorProfile } from '../user/schemas/spectator-profile.schema';
import { Model } from 'mongoose';

const TICK_INTERVAL_MS = 500;

@Injectable()
export class RaceBroadcastService implements OnModuleInit {
  private readonly logger = new Logger(RaceBroadcastService.name);

  // Live broadcast sessions
  private readonly activeBroadcasts = new Set<string>();

  // Replay sessions đang chạy — tránh 2 replay loop chồng nhau cho cùng raceId
  private readonly activeReplays = new Set<string>();

  // Snapshot tick hiện tại để client join muộn catch-up
  private readonly currentSnapshots = new Map<string, RaceTickFrame>();

  constructor(
    private readonly gateway: RaceBroadcastGateway,
    private readonly raceTickRepo: RaceTickRepository,
    private readonly raceEventRepo: RaceEventRepository,
    private readonly rawResultRepo: RawResultRepository,
    private readonly raceRepo: RaceRepository,
    private readonly notificationRepository: NotificationRepository,
    @InjectModel(SpectatorProfile.name)
    private readonly spectatorProfileModel: Model<SpectatorProfile>,
  ) {}

  onModuleInit() {
    this.gateway.setBroadcastService(this);
  }

  // ── LIVE: Referee trigger 
  async startBroadcast(
    raceId: string,
    fromTick = 0,
  ): Promise<{ message: string }> {
    const race = await this.raceRepo.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    if (race.status !== RaceStatusEnum.SIMULATED) {
      throw new BadRequestException(
        `Race phải ở trạng thái "Simulated" (hiện tại: ${race.status})`,
      );
    }

    if (this.activeBroadcasts.has(raceId)) {
      throw new BadRequestException('Race này đang được broadcast rồi');
    }

    const { tickMap, eventMap, maxTick } = await this.loadRaceData(raceId);

    if (fromTick < 0 || fromTick > maxTick) {
      throw new BadRequestException(`fromTick phải trong khoảng 0–${maxTick}`);
    }

    await this.raceRepo.updateStatus(raceId, RaceStatusEnum.ONGOING);
    this.activeBroadcasts.add(raceId);

    // 1. Lấy danh sách tất cả các user có vai trò SPECTATOR
    const spectators = await this.spectatorProfileModel.find().lean();

    // 2. Map dữ liệu tạo notification cho từng Spectator
    if (spectators.length > 0) {
      const notifications = spectators.map((spectator) => ({
        userId: spectator.userId,
        type: NotificationTypeEnum.RACE_BROADCAST_STARTED,
        title: NotificationTitleEnum.RACE_BROADCAST_STARTED,
        content: `Cuộc đua ${race.name || raceId} đã chính thức bắt đầu trực tiếp!`,
        isRead: false,
      }));

      // 3. Insert hàng loạt vào DB
      await this.notificationRepository.createMany(notifications);
    }

    this.logger.log(
      `[BROADCAST] Live race ${raceId} từ tick ${fromTick}/${maxTick}`,
    );

    // Chạy async — không block response
    this.runBroadcastLoop(
      raceId,
      maxTick,
      tickMap,
      eventMap,
      fromTick,
      'live',
    ).catch((err: any) => {
      this.logger.error(`[BROADCAST] ❌ ${raceId}: ${err?.message}`);
      this.cleanup(raceId);
    });

    const remaining = maxTick - fromTick + 1;
    return {
      message: `Broadcast bắt đầu từ tick ${fromTick}. ~${Math.round(remaining * 0.5)}s`,
    };
  }

  // ── REPLAY: Tất cả role xem lại 
  async startReplay(raceId: string): Promise<{ message: string }> {
    const race = await this.raceRepo.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');


   // Không cho replay khi race đang live broadcast
   if (this.activeBroadcasts.has(raceId)) {
     throw new BadRequestException(
       'Race này đang broadcast live, không thể replay',
     );
   }

   // Không cho chạy 2 replay loop chồng nhau cho cùng raceId
   if (this.activeReplays.has(raceId)) {
     throw new BadRequestException(
       'Race này đang được replay rồi, vui lòng đợi replay hiện tại kết thúc',
     );
   }

    // Replay được khi race đã Finished hoặc Ongoing
    const replayableStatuses = [
      RaceStatusEnum.FINISHED,
      RaceStatusEnum.ONGOING,
      // RaceStatusEnum.SIMULATED,
    ];
    if (!replayableStatuses.includes(race.status as RaceStatusEnum)) {
      throw new BadRequestException(
       'Race chưa được broadcast — chỉ có thể replay khi race đang ONGOING hoặc đã FINISHED'
      );
    }

    const { tickMap, eventMap, maxTick } = await this.loadRaceData(raceId);

    this.logger.log(`[REPLAY] Race ${raceId} — ${maxTick + 1} ticks`);

    this.activeReplays.add(raceId);

    // Replay dùng namespace riêng để không conflict với live
    // Chạy async
    this.runBroadcastLoop(
      raceId,
      maxTick,
      tickMap,
      eventMap,
      0,
      'replay',
    ).catch((err: any) => {
      this.logger.error(`[REPLAY] ❌ ${raceId}: ${err?.message}`);
      this.activeReplays.delete(raceId);
    });

    return {
      message: `Replay bắt đầu. ~${Math.round((maxTick + 1) * 0.5)}s`,
    };
  }

  // ── Load tick + event data từ DB 

  private async loadRaceData(raceId: string) {
    const allTicks = await this.raceTickRepo.findByRaceIdOrdered(raceId);
    const allEvents = await this.raceEventRepo.findByRaceId(raceId);

    if (allTicks.length === 0) {
      throw new BadRequestException(
        'Không có tick data — chạy simulation trước',
      );
    }

    const maxTick = Math.max(...allTicks.map((t) => t.tickNumber));

    // tickMap[tickNumber] = [horse1, horse2, ...]
    const tickMap = new Map<number, typeof allTicks>();
    for (const tick of allTicks) {
      const t = tick.tickNumber;
      if (!tickMap.has(t)) tickMap.set(t, []);
      tickMap.get(t)!.push(tick);
    }

    // eventMap[tickNumber] = [event1, event2, ...]
    const eventMap = new Map<number, typeof allEvents>();
    for (const event of allEvents) {
      const t = event.tickNumber;
      if (!eventMap.has(t)) eventMap.set(t, []);
      eventMap.get(t)!.push(event);
    }

    return { tickMap, eventMap, maxTick };
  }

  // ── Loop push tick mỗi 500ms ──────────────────────────────────────────────
  private async runBroadcastLoop(
    raceId: string,
    maxTick: number,
    tickMap: Map<number, any[]>,
    eventMap: Map<number, any[]>,
    startFrom: number,
    mode: 'live' | 'replay',
  ): Promise<void> {
    for (let t = startFrom; t <= maxTick; t++) {
      const frameTicks = tickMap.get(t) ?? [];
      const frameEvents = eventMap.get(t) ?? [];

      // Build tick frame
      const tickFrame: RaceTickFrame = {
        tickNumber: t,
        horses: frameTicks.map((tick) => ({
          horseId: tick.horseId.toString(),
          progress: tick.progress,
          currentSpeed: tick.currentSpeed,
          lane: tick.lane,
        })),
      };

      // Chỉ lưu snapshot cho live broadcast (không phải replay)
      if (mode === 'live') {
        this.currentSnapshots.set(raceId, tickFrame);
      }

      this.gateway.emitTick(raceId, tickFrame);

      // Emit events tại tick này
      for (const event of frameEvents) {
        const eventFrame: RaceEventFrame = {
          tickNumber: t,
          eventType: event.eventType,
          primaryHorseId: event.primaryHorseId.toString(),
          secondaryHorseId: event.secondaryHorseId?.toString() ?? null,
        };
        this.gateway.emitRaceEvent(raceId, eventFrame);
      }

      await this.sleep(TICK_INTERVAL_MS);
    }

    // Xong
    if (mode === 'live') {
      await this.onLiveBroadcastFinished(raceId);
    } else {
      this.logger.log(`[REPLAY] Race ${raceId} replay xong`);
      // Emit finished để FE biết replay xong
      const results = await this.rawResultRepo.findByRaceId(raceId);
      this.gateway.emitRaceFinished(raceId, {
        raceId,
        results: results.map((r) => ({
          horseId: r.horseId.toString(),
          rawRank: r.rawRank,
          finishedTime: r.finishedTime,
        })),
      });
      this.activeReplays.delete(raceId);
    }
  }

  // ── Sau khi live broadcast xong 
  private async onLiveBroadcastFinished(raceId: string): Promise<void> {
    this.logger.log(`[BROADCAST] ✅ Race ${raceId} live xong`);

    const results = await this.rawResultRepo.findByRaceId(raceId);
    this.gateway.emitRaceFinished(raceId, {
      raceId,
      results: results.map((r) => ({
        horseId: r.horseId.toString(),
        rawRank: r.rawRank,
        finishedTime: r.finishedTime,
      })),
    });

    this.cleanup(raceId);
    this.logger.log(`[BROADCAST] Chờ Referee confirm finalRank`);
  }

  // ── Cleanup 
  private cleanup(raceId: string): void {
    this.activeBroadcasts.delete(raceId);
    this.currentSnapshots.delete(raceId);
  }

  // ── Public helpers 
  getCurrentSnapshot(raceId: string): RaceTickFrame | null {
    return this.currentSnapshots.get(raceId) ?? null;
  }

  isBroadcasting(raceId: string): boolean {
    return this.activeBroadcasts.has(raceId);
  }

  isReplaying(raceId: string): boolean {
    return this.activeReplays.has(raceId);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
