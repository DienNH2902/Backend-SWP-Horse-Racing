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

const   TICK_INTERVAL_MS = 500;

@Injectable()
export class RaceBroadcastService implements OnModuleInit {
  private readonly logger = new Logger(RaceBroadcastService.name);

  // Set<raceId> — các race đang broadcast
  private readonly activeBroadcasts = new Set<string>();

  // Map<raceId, RaceTickFrame> — snapshot tick hiện tại để catch-up
  private readonly currentSnapshots = new Map<string, RaceTickFrame>();

  constructor(
    private readonly gateway: RaceBroadcastGateway,
    private readonly raceTickRepo: RaceTickRepository,
    private readonly raceEventRepo: RaceEventRepository,
    private readonly rawResultRepo: RawResultRepository,
    private readonly raceRepo: RaceRepository,
  ) {}

  // Inject service vào gateway sau khi module init (tránh circular dependency)
  onModuleInit() {
    this.gateway.setBroadcastService(this);
  }

  // ── PUBLIC: Referee trigger broadcast ────────────────────────────────────
  async startBroadcast(
    raceId: string,
    fromTick = 0,
  ): Promise<{ message: string }> {
    // ── Validate ──────────────────────────────────────────────────────────
    const race = await this.raceRepo.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    if (race.status !== RaceStatusEnum.SIMULATED) {
      throw new BadRequestException(
        `Race phải ở trạng thái "Simulated" để broadcast (hiện tại: ${race.status})`,
      );
    }

    if (this.activeBroadcasts.has(raceId)) {
      throw new BadRequestException('Race này đang được broadcast rồi');
    }

    // ── Load data từ DB ───────────────────────────────────────────────────
    const allTicks = await this.raceTickRepo.findByRaceIdOrdered(raceId);
    const allEvents = await this.raceEventRepo.findByRaceId(raceId);

    if (allTicks.length === 0) {
      throw new BadRequestException(
        'Không có data — hãy chạy simulation trước',
      );
    }

    const maxTick = Math.max(...allTicks.map((t) => t.tickNumber));

    // Validate fromTick
    if (fromTick < 0 || fromTick > maxTick) {
      throw new BadRequestException(
        `fromTick phải trong khoảng 0–${maxTick}`,
      );
    }

    // ── Build lookup maps ─────────────────────────────────────────────────

    // tickMap[tickNumber] = [horse1_tick, horse2_tick, ...]
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

    this.logger.log(
      `[BROADCAST] Race ${raceId}: ${allTicks.length} ticks, ` +
      `${allEvents.length} events, bắt đầu từ tick ${fromTick}`,
    );

    // ── Update status → Ongoing ───────────────────────────────────────────
    await this.raceRepo.updateStatus(raceId, RaceStatusEnum.ONGOING);
    this.activeBroadcasts.add(raceId);

    // ── Chạy loop async (không block response) ────────────────────────────
    this.runBroadcastLoop(raceId, maxTick, tickMap, eventMap, fromTick).catch(
      (err: any) => {
        this.logger.error(
          `[BROADCAST] ❌ Race ${raceId} failed: ${err?.message}`,
          err?.stack,
        );
        this.cleanup(raceId);
      },
    );

    const remainingTicks = maxTick - fromTick + 1;
    const estimatedSeconds = Math.round(remainingTicks * 0.5);

    return {
      message:
        `Broadcast bắt đầu từ tick ${fromTick}. ` +
        `Tổng ${remainingTicks} ticks × 500ms = ~${estimatedSeconds}s`,
    };
  }

  // ── PRIVATE: Loop push tick mỗi 500ms ────────────────────────────────────
  private async runBroadcastLoop(
    raceId: string,
    maxTick: number,
    tickMap: Map<number, any[]>,
    eventMap: Map<number, any[]>,
    startFrom: number,
  ): Promise<void> {
    for (let t = startFrom; t <= maxTick; t++) {
      const frameTicks  = tickMap.get(t)  ?? [];
      const frameEvents = eventMap.get(t) ?? [];

      // ── Build + emit tick frame ─────────────────────────────────────────
      const tickFrame: RaceTickFrame = {
        tickNumber: t,
        horses: frameTicks.map((tick) => ({
          horseId:      tick.horseId.toString(),
          progress:     tick.progress,
          currentSpeed: tick.currentSpeed,
          lane:         tick.lane,
        })),
      };

      // Lưu snapshot để client join muộn có thể catch-up
      this.currentSnapshots.set(raceId, tickFrame);
      this.gateway.emitTick(raceId, tickFrame);

      // ── Emit events tại tick này ────────────────────────────────────────
      for (const event of frameEvents) {
        const eventFrame: RaceEventFrame = {
          tickNumber:       t,
          eventType:        event.eventType,
          primaryHorseId:   event.primaryHorseId.toString(),
          secondaryHorseId: event.secondaryHorseId?.toString() ?? null,
        };
        this.gateway.emitRaceEvent(raceId, eventFrame);
      }

      // ── Chờ 500ms ───────────────────────────────────────────────────────
      await this.sleep(TICK_INTERVAL_MS);
    }

    // ── Broadcast xong ────────────────────────────────────────────────────
    await this.onBroadcastFinished(raceId);
  }

  // ── Sau khi broadcast xong ────────────────────────────────────────────────
  private async onBroadcastFinished(raceId: string): Promise<void> {
    this.logger.log(`[BROADCAST] ✅ Race ${raceId} broadcast hoàn thành`);

    const results = await this.rawResultRepo.findByRaceId(raceId);

    // Push bảng kết quả xuống tất cả client
    this.gateway.emitRaceFinished(raceId, {
      raceId,
      results: results.map((r) => ({
        horseId:      r.horseId.toString(),
        rawRank:      r.rawRank,
        finishedTime: r.finishedTime,
      })),
    });

    this.cleanup(raceId);
    this.logger.log(
      `[BROADCAST] Race ${raceId} done — chờ Referee confirm finalRank`,
    );
  }

  // ── Cleanup sau khi xong hoặc lỗi ────────────────────────────────────────
  private cleanup(raceId: string): void {
    this.activeBroadcasts.delete(raceId);
    this.currentSnapshots.delete(raceId);
  }

  // ── PUBLIC helpers ────────────────────────────────────────────────────────
  getCurrentSnapshot(raceId: string): RaceTickFrame | null {
    return this.currentSnapshots.get(raceId) ?? null;
  }

  isBroadcasting(raceId: string): boolean {
    return this.activeBroadcasts.has(raceId);
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}