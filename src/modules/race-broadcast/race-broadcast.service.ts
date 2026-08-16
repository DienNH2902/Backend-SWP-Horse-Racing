import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';  
import {
  RaceBroadcastGateway,
  RaceTickFrame,
  RaceEventFrame,
  HorseTickState
} from './gateway/race-broadcast.gateway';
import { RaceTickRepository } from '../race-simulation/repositories/race-tick.repository';
import { RaceEventRepository } from '../race-simulation/repositories/race-event.repository';
import { RawResultRepository } from '../race-simulation/repositories/raw-result.repository';
import { RegistrationRepository } from '../registration/registration.repository';
import { RaceRepository } from '../race/race.repository';
import { RaceStatusEnum } from 'src/constants/raceStatus.enum';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
import { InjectModel } from '@nestjs/mongoose';
import { SpectatorProfile } from '../user/schemas/spectator-profile.schema';
import { REDIS_CLIENT } from '../redis/redis.constants';

import { PaginatedBroadcastRacesDto } from './dto/broadcast-race-list.dto';
import { Model } from 'mongoose';

const TICK_INTERVAL_MS = 500;
// TTL cho mọi key Redis liên quan tới 1 lần broadcast/replay,
// để nếu process crash mà không kịp cleanup() thì key vẫn tự hết hạn thay vì leak.
const BROADCAST_STATE_TTL_SECONDS = 60 * 60 * 3; // 3h

@Injectable()
export class RaceBroadcastService implements OnModuleInit {
  private readonly logger = new Logger(RaceBroadcastService.name);

  // Live broadcast sessions
  // private readonly activeBroadcasts = new Set<string>();

  // // Replay sessions đang chạy — tránh 2 replay loop chồng nhau cho cùng raceId
  // private readonly activeReplays = new Set<string>();

  // // Snapshot tick hiện tại để client join muộn catch-up
  // // private readonly currentSnapshots = new Map<string, RaceTickFrame>();
  // private readonly currentSnapshots = new Map<string, Map<string, HorseTickState>>();
  // private readonly currentSnapshotTick = new Map<string, number>(); 

  constructor(
    private readonly gateway: RaceBroadcastGateway,
    private readonly raceTickRepo: RaceTickRepository,
    private readonly raceEventRepo: RaceEventRepository,
    private readonly rawResultRepo: RawResultRepository,
    private readonly raceRepo: RaceRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly registrationRepo: RegistrationRepository, 
    @InjectModel(SpectatorProfile.name)
    private readonly spectatorProfileModel: Model<SpectatorProfile>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  onModuleInit() {
    this.gateway.setBroadcastService(this);
  }

  private activeBroadcastKey(raceId: string): string {
    return `broadcast:active:${raceId}`;
  }
  private activeReplayKey(raceId: string): string {
    return `replay:active:${raceId}`;
  }
  private snapshotKey(raceId: string): string {
    return `broadcast:snapshot:${raceId}`;
  }
  private snapshotTickKey(raceId: string): string {
    return `broadcast:snapshot:tick:${raceId}`;
  }

  // ── LIVE: Referee trigger 
  async startBroadcast(
    raceId: string,
    fromTick = 0,
  ): Promise<{ message: string }> {
    const race = await this.raceRepo.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    const allowedStatuses = [RaceStatusEnum.SIMULATED, RaceStatusEnum.ONGOING];
    if (!allowedStatuses.includes(race.status as RaceStatusEnum)) {
      throw new BadRequestException(
        `Race phải ở trạng thái "Simulated" hoặc "Ongoing" mới có thể broadcast (hiện tại: ${race.status})`,
      );
    }

    // từ Set.has() (không share giữa nhiều instance) sang
    // SET NX EX atomic trên Redis. Đây vừa là check "đã broadcast chưa"
    // vừa là acquire lock cùng lúc, tránh race condition giữa 2 request
    // /2 instance đến gần như đồng thời.
    const lockAcquired = await this.redis.set(
      this.activeBroadcastKey(raceId),
      '1',
      'EX',
      BROADCAST_STATE_TTL_SECONDS,
      'NX',
    );
    if (lockAcquired !== 'OK') {
      throw new BadRequestException('Race này đang được broadcast rồi');
    }

    // bọc try/catch để nếu có lỗi xảy ra SAU khi acquire lock
    // (validate fromTick, loadRaceData throw...) thì giải phóng lock ngay,
    // không để race bị kẹt ở trạng thái "đang broadcast" cho tới khi TTL hết hạn.
    try {
      const { tickMap, eventMap, maxTick } = await this.loadRaceData(raceId);

      if (!Number.isInteger(fromTick) || fromTick < 0 || fromTick > maxTick) {
        throw new BadRequestException(`fromTick phải là số nguyên trong khoảng 0–${maxTick}`);
      }

      if (race.status === RaceStatusEnum.SIMULATED) {
        await this.raceRepo.updateStatus(raceId, RaceStatusEnum.ONGOING);
      }

      try {
        const spectators = await this.spectatorProfileModel.find().lean();

        if (spectators.length > 0) {
          const notifications = spectators.map((spectator) => ({
            userId: spectator.userId,
            type: NotificationTypeEnum.RACE_BROADCAST_STARTED,
            title: NotificationTitleEnum.RACE_BROADCAST_STARTED,
            content: `Cuộc đua ${race.name || raceId} đã chính thức bắt đầu trực tiếp!`,
            isRead: false,
          }));

          await this.notificationRepository.createMany(notifications);
        }
      } catch (err: any) {
        this.logger.error(
          `[BROADCAST] Gửi notification thất bại cho ${raceId}: ${err?.message}`,
        );
        // không throw — broadcast vẫn tiếp tục chạy dù notification lỗi
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
        this.cleanup(raceId).catch((cleanupErr: any) =>
          this.logger.error(`[BROADCAST] Cleanup lỗi ${raceId}: ${cleanupErr?.message}`),
        );
      });

      const remaining = maxTick - fromTick + 1;
      return {
        message: `Broadcast bắt đầu từ tick ${fromTick}. ~${Math.round(remaining * 0.5)}s`,
      };
    } catch (err) {
      // giải phóng lock ngay khi có lỗi xảy ra sau khi đã acquire
      await this.redis.del(this.activeBroadcastKey(raceId));
      throw err;
    }
  }

  // ── REPLAY: Tất cả role xem lại 
  async startReplay(raceId: string): Promise<{ message: string }> {
    const race = await this.raceRepo.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    // >>> THAY ĐỔI — this.activeBroadcasts.has(raceId) → await isBroadcasting(raceId) (Redis, async)
    if (await this.isBroadcasting(raceId)) {
      throw new BadRequestException(
        'Race này đang broadcast live, không thể replay',
      );
    }

    const lockAcquired = await this.redis.set(
      this.activeReplayKey(raceId),
      '1',
      'EX',
      BROADCAST_STATE_TTL_SECONDS,
      'NX',
    );
    if (lockAcquired !== 'OK') {
      throw new BadRequestException(
        'Race này đang được replay rồi, vui lòng đợi replay hiện tại kết thúc',
      );
    }

    try {
      const replayableStatuses = [
        RaceStatusEnum.FINISHED,
        RaceStatusEnum.ONGOING,
      ];
      if (!replayableStatuses.includes(race.status as RaceStatusEnum)) {
        throw new BadRequestException(
         'Race chưa được broadcast — chỉ có thể replay khi race đang ONGOING hoặc đã FINISHED'
        );
      }

      const { tickMap, eventMap, maxTick } = await this.loadRaceData(raceId);

      this.logger.log(`[REPLAY] Race ${raceId} — ${maxTick + 1} ticks`);

      this.runBroadcastLoop(
        raceId,
        maxTick,
        tickMap,
        eventMap,
        0,
        'replay',
      ).catch((err: any) => {
        this.logger.error(`[REPLAY] ❌ ${raceId}: ${err?.message}`);
        this.redis.del(this.activeReplayKey(raceId)).catch(() => undefined);
      });

      return {
        message: `Replay bắt đầu. ~${Math.round((maxTick + 1) * 0.5)}s`,
      };
    } catch (err) {
      await this.redis.del(this.activeReplayKey(raceId));
      throw err;
    }
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

  // Loop push tick mỗi 500ms 
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

      const tickFrame: RaceTickFrame = {
        tickNumber: t,
        horses: frameTicks.map((tick) => ({
          horseId: tick.horseId.toString(),
          progress: tick.progress,
          currentSpeed: tick.currentSpeed,
          lane: tick.lane,
        })),
      };

      if (mode === 'live' && tickFrame.horses.length > 0) {
        const pipeline = this.redis.pipeline();
        for (const h of tickFrame.horses) {
          pipeline.hset(this.snapshotKey(raceId), h.horseId, JSON.stringify(h));
        }
        // HSET không nhận EX trực tiếp — phải EXPIRE riêng, nếu không
        // snapshot của race bị crash sẽ leak vĩnh viễn trong Redis.
        pipeline.expire(this.snapshotKey(raceId), BROADCAST_STATE_TTL_SECONDS);
        pipeline.set(this.snapshotTickKey(raceId), t, 'EX', BROADCAST_STATE_TTL_SECONDS);
        await pipeline.exec();
      }

      this.gateway.emitTick(raceId, tickFrame);

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

    if (mode === 'live') {
      await this.onLiveBroadcastFinished(raceId);
    } else {
      this.logger.log(`[REPLAY] Race ${raceId} replay xong`);
      const results = await this.rawResultRepo.findByRaceId(raceId);
      this.gateway.emitRaceFinished(raceId, {
        raceId,
        results: results.map((r) => ({
          horseId: r.horseId.toString(),
          rawRank: r.rawRank,
          finishedTime: r.finishedTime,
        })),
      });
      await this.redis.del(this.activeReplayKey(raceId));
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

    await this.cleanup(raceId);
    this.logger.log(`[BROADCAST] Chờ Referee confirm finalRank`);
  }


  async getLiveBroadcastRaces(
    page = 1,
    limit = 10,
  ): Promise<PaginatedBroadcastRacesDto> {
    const safePage = page < 1 ? 1 : page;
    const safeLimit = limit < 1 ? 10 : Math.min(limit, 100);
    const skip = (safePage - 1) * safeLimit;

    const [races, total] = await Promise.all([
      this.raceRepo.findAllForBroadcast(skip, safeLimit),
      this.raceRepo.countAllForBroadcast(),
    ]);

    if (!races.length) {
      return { data: [], total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
    }

    const raceIds = races.map((r: any) => r._id);

    const [registrations, liveStatusMap, replayStatusMap] = await Promise.all([
      this.registrationRepo.findConfirmedByRaceIds(raceIds),
      this.batchCheckExists(raceIds.map((id: any) => this.activeBroadcastKey(id.toString()))),
      this.batchCheckExists(raceIds.map((id: any) => this.activeReplayKey(id.toString()))),
    ]);

    const participantsByRace = new Map<string, any[]>();
    for (const reg of registrations as any[]) {
      const key = reg.raceId.toString();
      if (!participantsByRace.has(key)) participantsByRace.set(key, []);
      participantsByRace.get(key)!.push(reg);
    }

    const data = races.map((race: any) => {
      const raceIdStr = race._id.toString();
      const regs = participantsByRace.get(raceIdStr) || [];
      const totalSlots = race.tournamentId?.horsesPerRace ?? 0;
      const filledSlots = regs.length;

      return {
        raceId: raceIdStr,
        tournamentId: race.tournamentId?._id?.toString() ?? '',
        tournamentTitle: race.tournamentId?.title ?? '',
        raceCourseName: race.raceCourseId?.name ?? null,
        name: race.name,
        roundNumber: race.roundNumber,
        raceOrder: race.raceOrder,
        date: race.date,
        startTime: race.startTime,
        status: race.status,
        totalBettors: race.totalBettors,
        totalSlots,
        filledSlots,
        availableSlots: totalSlots - filledSlots,
        isLive: liveStatusMap.get(raceIdStr) ?? false,
        isReplaying: replayStatusMap.get(raceIdStr) ?? false,
        participants: regs.map((r: any) => ({
          horseId: r.horseId?._id?.toString() ?? '',
          horseName: r.horseId?.name ?? 'Unknown Horse',
          jockeyId: r.jockeyId?._id?.toString() ?? '',
          jockeyName: r.jockeyId?.fullName ?? 'N/A',
          gateNumber: r.gateNumber,
        })),
      };
    });

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  private async batchCheckExists(keys: string[]): Promise<Map<string, boolean>> {
    const map = new Map<string, boolean>();
    if (keys.length === 0) return map;

    const pipeline = this.redis.pipeline();
    keys.forEach((k) => pipeline.exists(k));
    const results = await pipeline.exec();

    keys.forEach((key, idx) => {
      const raceId = key.split(':').pop()!;
      const exists = results?.[idx]?.[1] === 1;
      map.set(raceId, exists);
    });
    return map;
  }

  // ── Cleanup 
  private async cleanup(raceId: string): Promise<void> {
    await this.redis
      .multi()
      .del(this.activeBroadcastKey(raceId))
      .del(this.snapshotKey(raceId))
      .del(this.snapshotTickKey(raceId))
      .exec();
  }

  // Public helpers 
  async getCurrentSnapshot(raceId: string): Promise<RaceTickFrame | null> {
    const horseMapRaw = await this.redis.hgetall(this.snapshotKey(raceId));
    if (!horseMapRaw || Object.keys(horseMapRaw).length === 0) return null;

    const tickStr = await this.redis.get(this.snapshotTickKey(raceId));

    return {
      tickNumber: tickStr ? parseInt(tickStr, 10) : 0,
      horses: Object.values(horseMapRaw).map((v) => JSON.parse(v) as HorseTickState),
    };
  }

  async isBroadcasting(raceId: string): Promise<boolean> {
    return (await this.redis.exists(this.activeBroadcastKey(raceId))) === 1;
  }

  // >>> THAY ĐỔI — đồng bộ → async (Redis EXISTS)
  async isReplaying(raceId: string): Promise<boolean> {
    return (await this.redis.exists(this.activeReplayKey(raceId))) === 1;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
