import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

import { RaceTickRepository } from './repositories/race-tick.repository';
import { RaceEventRepository } from './repositories/race-event.repository';
import { HorseRaceStatsRepository } from './repositories/horse-race-stat.repository';
import { RawResultRepository } from './repositories/raw-result.repository';

import { RaceRepository } from '../race/race.repository';
import { RaceCourseRepository } from '../race/race-course/race-course.repository';
import { RaceConditionRepository } from '../race/race-condition/race-condition.repository';
import { RegistrationRepository } from '../registration/registration.repository';
import { UsersRepository } from '../user/user.repository';

import { RaceStatusEnum } from 'src/constants/raceStatus.enum';
import { RawResultStatus } from '../../constants/rawResultStatus.enum';

import { calcHorseRaceStats } from './engine/stats-calculator';
import { calcConditionModifier } from './engine/condition-modifier';
import { generateTicks } from './engine/tick-generator';
import { detectOvertakeAndLead } from './engine/event-detector';
import { HorseEngineData, HorseInput } from './engine/engine.types';

import { CreateRawResultDto } from './repositories/raw-result.repository';
import { CreateHorseRaceStatsDto } from './repositories/horse-race-stat.repository';
import { JockeyStatusEnum } from 'src/constants/jockeyStatusEnum.enum';

const TICK_DURATION_MS = 500;

@Injectable()
export class RaceSimulationService {
  private readonly logger = new Logger(RaceSimulationService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,

    // Simulation-owned repos
    private readonly raceTickRepo: RaceTickRepository,
    private readonly raceEventRepo: RaceEventRepository,
    private readonly horseRaceStatsRepo: HorseRaceStatsRepository,
    private readonly rawResultRepo: RawResultRepository,

    // External repos
    private readonly raceRepo: RaceRepository,
    private readonly raceCourseRepo: RaceCourseRepository,
    private readonly raceConditionRepo: RaceConditionRepository,
    private readonly registrationRepo: RegistrationRepository,
    private readonly usersRepo: UsersRepository,
  ) {}

  // ── [DEV] Reset để chạy lại simulation nhiều lần ─────────────────────────
  async resetSimulation(raceId: string): Promise<{ message: string }> {
    this.logger.warn(`[RESET] Xóa simulation data của race ${raceId}`);

    // 1. Tìm các rawResult trước khi xóa để lấy danh sách jockeyId (hoặc query từ race/assignment)
    const rawResults = await this.rawResultRepo.findByRaceId(raceId);

    if (rawResults && rawResults.length > 0) {
      const jockeyIds = Array.from(new Set(rawResults.map((r) => r.jockeyId)));

      // 2. Trả trạng thái của các Jockey về AVAILABLE
      await this.usersRepo.updateManyStatus(
        jockeyIds,
        JockeyStatusEnum.AVAILABLE,
      );
      this.logger.warn(
        `[RESET] Đã trả trạng thái ${jockeyIds.length} Jockey về AVAILABLE`,
      );
    }

    await this.raceTickRepo.deleteByRaceId(raceId);
    await this.raceEventRepo.deleteByRaceId(raceId);
    await this.rawResultRepo.deleteByRaceId(raceId);
    await this.horseRaceStatsRepo.deleteByRaceId(raceId);
    await this.raceRepo.updateStatus(raceId, RaceStatusEnum.READY);

    this.logger.warn(`[RESET] Done — race ${raceId} reset về "Ready"`);
    return {
      message: 'Đã xóa simulation data, race reset về trạng thái Ready',
    };
  }

  // ── Main: chạy simulation ─────────────────────────────────────────────────
  async runSimulation(raceId: string): Promise<{ message: string }> {
    this.logger.log(`[SIM] ═══ Bắt đầu simulation race ${raceId} ═══`);

    // ── 1. Load + validate ────────────────────────────────────────────────────
    const race = await this.raceRepo.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    this.logger.log(`[SIM] Race status: ${race.status}`);

    if (race.status !== RaceStatusEnum.READY) {
      throw new BadRequestException(
        `Race phải ở trạng thái "Ready" mới có thể simulate (hiện tại: ${race.status})`,
      );
    }

    if (!race.raceCourseId) {
      throw new BadRequestException('Race chưa được gán RaceCourse');
    }

    // Handle cả 2 trường hợp: raceCourseId là ObjectId thuần hoặc đã populate
    const raceCourseId =
      race.raceCourseId instanceof Types.ObjectId
        ? race.raceCourseId
        : (race.raceCourseId as any)._id;

    const raceCourse = await this.raceCourseRepo.findById(
      raceCourseId.toString(),
    );
    if (!raceCourse) throw new NotFoundException('Không tìm thấy RaceCourse');

    this.logger.log(
      `[SIM] RaceCourse: ${(raceCourse as any).name}, trackType=${(raceCourse as any).trackType}`,
    );

    const condition = await this.raceConditionRepo.findByRaceId(raceId);
    if (!condition) {
      throw new NotFoundException(
        'Chưa có RaceCondition — Referee cần nhập điều kiện trước',
      );
    }

    this.logger.log(
      `[SIM] RaceCondition: weather=${(condition as any).weather}, ` +
        `trackCondition=${(condition as any).trackCondition}, ` +
        `windSpeed=${(condition as any).windSpeed}`,
    );

    // ── 2. Load registrations confirmed ──────────────────────────────────────
    const registrations =
      await this.registrationRepo.findConfirmedWithDetails(raceId);
    this.logger.log(`[SIM] Số registration confirmed: ${registrations.length}`);

    if (registrations.length < 2) {
      throw new BadRequestException(
        'Cần ít nhất 2 ngựa đã confirmed để chạy simulation',
      );
    }

    // ── 3. Log dữ liệu raw từng ngựa ─────────────────────────────────────────
    registrations.forEach((reg, i) => {
      this.logger.log(
        `[SIM] Ngựa ${i + 1}: ` +
          `horse=${JSON.stringify({
            id: reg.horse?._id,
            weight: reg.horse?.weight,
            height: reg.horse?.height,
            winRate: reg.horse?.winRate,
            totalWin: reg.horse?.totalWin,
          })} | ` +
          `jockey=${JSON.stringify({ id: reg.jockeyProfile?._id, weight: reg.jockeyProfile?.weight })} | ` +
          `gate=${reg.gateNumber}`,
      );
    });

    const raceObjectId = new Types.ObjectId(raceId);

    const jockeyProfileMap = new Map<
      string,
      { _id: Types.ObjectId; weight: number; height: number; winRate: number }
    >();
    for (const reg of registrations) {
      const userId =
        (reg.jockeyProfile as any)?._id?.toString() ??
        (reg.jockeyProfile as any)?.toString();

      if (!jockeyProfileMap.has(userId)) {
        const realProfile =
          await this.usersRepo.findJockeyProfileByUserId(userId);
        if (!realProfile) {
          throw new NotFoundException(
            `Không tìm thấy JockeyProfile cho user ${userId} (registration ${reg._id})`,
          );
        }
        jockeyProfileMap.set(userId, {
          _id: (realProfile as any)._id,
          weight: (realProfile as any).weight,
          height: (realProfile as any).height,
          winRate: (realProfile as any).winRate ?? 0,
        });
        this.logger.log(
          `[SIM] Resolved JockeyProfile thật cho user ${userId}: ` +
            `profileId=${(realProfile as any)._id}, weight=${(realProfile as any).weight}`,
        );
      }
    }

    // ── 4. Build HorseInput 
    const horseInputs: HorseInput[] = registrations.map((reg) => {
      const userId =
        (reg.jockeyProfile as any)?._id?.toString() ??
        (reg.jockeyProfile as any)?.toString();
      const realProfile = jockeyProfileMap.get(userId)!;

      return {
        horseId: reg.horse._id,
        jockeyId: realProfile._id, // ← JockeyProfile._id thật, không phải User._id
        lane: reg.gateNumber,
        horseWeight: reg.horse.weight,
        horseHeight: reg.horse.height,
        horseWinRate: reg.horse.winRate,
        jockeyWeight: realProfile.weight,
        jockeyWinRate: realProfile.winRate,
        totalWin: reg.horse.totalWin ?? 0,
      };
    });

    // ── 5. Tính stats + conditionModifier ────────────────────────────────────
    const horsesData: HorseEngineData[] = horseInputs.map((input) => {
      const stats = calcHorseRaceStats(input);
      const conditionModifier = calcConditionModifier(
        condition,
        raceCourse,
        input.horseWeight,
      );

      this.logger.log(
        `[SIM] Stats horse ${input.horseId}: ` +
          `baseSpeed=${stats.baseSpeed.toFixed(3)}, ` +
          `accel=${stats.acceleration.toFixed(3)}, ` +
          `stamina=${stats.stamina.toFixed(3)}, ` +
          `totalLoad=${stats.totalLoad}, ` +
          `condMod=${conditionModifier.toFixed(3)}`,
      );

      return {
        horseId: input.horseId,
        jockeyId: input.jockeyId,
        lane: input.lane,
        totalWin: input.totalWin,
        horseWinRate: input.horseWinRate,
        jockeyWinRate: input.jockeyWinRate,
        stats,
        conditionModifier,
      };
    });

    // ── 6. Generate ticks (độc lập từng ngựa) ────────────────────────────────
    const allTicks: ReturnType<typeof generateTicks>['ticks'] = [];
    const allEvents: ReturnType<typeof generateTicks>['events'] = [];
    const finishTickMap: Record<string, number> = {};

    for (const horse of horsesData) {
      const { ticks, events, finishTick } = generateTicks(raceObjectId, horse);

      this.logger.log(
        `[SIM] Horse ${horse.horseId}: ` +
          `${ticks.length} ticks, finishTick=${finishTick}, ` +
          `${events.length} events (stumble/burst)`,
      );

      allTicks.push(...ticks);
      allEvents.push(...events);
      finishTickMap[horse.horseId.toString()] = finishTick;
    }

    this.logger.log(`[SIM] Tổng ticks sau generate: ${allTicks.length}`);

    // ── 7. Pass 2 — detect overtake + lead_change ────────────────────────────
    const horseIds = horsesData.map((h) => h.horseId);
    const passEvents = detectOvertakeAndLead(
      raceObjectId,
      horseIds,
      allTicks,
      finishTickMap,
    );
    this.logger.log(
      `[SIM] Pass 2 events (overtake/lead_change): ${passEvents.length}`,
    );
    allEvents.push(...passEvents);

    // ── 8. Tính rawRank từ finishTick tăng dần ───────────────────────────────
    const sortedByFinish = [...horsesData].sort(
      (a, b) =>
        finishTickMap[a.horseId.toString()] -
        finishTickMap[b.horseId.toString()],
    );

    this.logger.log('[SIM] Thứ hạng cuối:');
    sortedByFinish.forEach((h, i) => {
      this.logger.log(
        `  Rank ${i + 1}: horse=${h.horseId}, finishTick=${finishTickMap[h.horseId.toString()]}`,
      );
    });

    const rawResults: CreateRawResultDto[] = sortedByFinish.map(
      (horse, index) => {
        const finishTick = finishTickMap[horse.horseId.toString()];
        const finishedTime = new Date(
          race.startTime.getTime() + finishTick * TICK_DURATION_MS,
        );
        return {
          raceId: raceObjectId,
          horseId: horse.horseId,
          jockeyId: horse.jockeyId,
          rawRank: index + 1,
          finalRank: index + 1,
          status: RawResultStatus.PENDING,
          finishedTime,
        };
      },
    );

    // ── 9. Build HorseRaceStats snapshot ─────────────────────────────────────
    const statsSnapshots: CreateHorseRaceStatsDto[] = horsesData.map((h) => ({
      raceId: raceObjectId,
      horseId: h.horseId,
      jockeyId: h.jockeyId,
      totalLoad: h.stats.totalLoad,
      baseSpeed: h.stats.baseSpeed,
      acceleration: h.stats.acceleration,
      stamina: h.stats.stamina,
      totalWin: h.totalWin,
      horseWinRate: h.horseWinRate,
      jockeyWinRate: h.jockeyWinRate,
    }));

    // ── 10. Bulk insert trong transaction ─────────────────────────────────────
    this.logger.log(
      `[SIM] Transaction: ${allTicks.length} ticks | ${allEvents.length} events | ` +
        `${rawResults.length} results | ${statsSnapshots.length} stats`,
    );

    // Lấy danh sách ID của các JockeyProfile thật tham gia trận đua
    const jockeyProfileIds = Array.from(jockeyProfileMap.values()).map(
      (profile) => profile._id,
    );

    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        await this.raceTickRepo.bulkInsert(allTicks);
        this.logger.log(`[SIM] ✅ Inserted ${allTicks.length} race_ticks`);

        await this.raceEventRepo.bulkInsert(allEvents);
        this.logger.log(`[SIM] ✅ Inserted ${allEvents.length} race_events`);

        await this.rawResultRepo.bulkInsert(rawResults);
        this.logger.log(`[SIM] ✅ Inserted ${rawResults.length} raw_results`);

        await this.horseRaceStatsRepo.bulkInsert(statsSnapshots);
        this.logger.log(
          `[SIM] ✅ Inserted ${statsSnapshots.length} horse_race_stats`,
        );

        // 🟢 CẬP NHẬT TRẠNG THÁI JOCKEY THÀNH BUSY
        await this.usersRepo.updateManyStatus(
          jockeyProfileIds,
          JockeyStatusEnum.BUSY,
        );
        this.logger.log(
          `[SIM] ✅ Cập nhật status ${jockeyProfileIds.length} jockey thành BUSY`,
        );
        await this.raceRepo.updateStatus(raceId, RaceStatusEnum.SIMULATED);
        this.logger.log(`[SIM] ✅ Race status → simulated`);
      });
    } catch (err: any) {
      this.logger.error(
        `[SIM] ❌ Transaction failed: ${err?.message ?? err}`,
        err?.stack,
      );
      throw err;
    } finally {
      await session.endSession();
    }

    this.logger.log(`[SIM] ═══ Simulation hoàn thành ═══`);
    return {
      message: `Simulation hoàn thành. Tổng ${allTicks.length} ticks, ${allEvents.length} events.`,
    };
  }

  // ── Xem kết quả sau simulation ────────────────────────────────────────────
  async getSimulationResult(raceId: string) {
    const results = await this.rawResultRepo.findByRaceId(raceId);
    const stats = await this.horseRaceStatsRepo.findByRaceId(raceId);
    const events = await this.raceEventRepo.findByRaceId(raceId);
    return { results, stats, events };
  }
}
