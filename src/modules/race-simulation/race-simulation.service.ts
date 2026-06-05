import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

// ── Repositories (simulation-owned) ──────────────────────────────────────────
import { RaceTickRepository } from './repositories/race-tick.repository';
import { RaceEventRepository } from './repositories/race-event.repository';
import { HorseRaceStatsRepository } from './repositories/horse-race-stat.repository';
import { RawResultRepository } from './repositories/raw-result.repository';

import { RaceRepository } from '../race/race.repository';
import { RaceCourseRepository } from '../race/race-course/race-course.repository';
import { RaceConditionRepository } from '../race/race-condition/race-condition.repository';
import { RegistrationRepository } from '../registration/registration.repository';

// ── Enums — THAY PATH NÀY cho đúng vị trí enum trong project của bạn ─────────
import { RaceStatusEnum } from 'src/constants/raceStatus.enum';
import { RawResultStatus } from './schemas/raw-result.schema';

// ── Engine ────────────────────────────────────────────────────────────────────
import { calcHorseRaceStats } from './engine/stats-calculator';
import { calcConditionModifier } from './engine/condition-modifier';
import { generateTicks } from './engine/tick-generator';
import { detectOvertakeAndLead } from './engine/event-detector';
import { HorseEngineData, HorseInput } from './engine/engine.types';

// ── DTOs ──────────────────────────────────────────────────────────────────────
import { CreateRawResultDto } from './repositories/raw-result.repository';
import { CreateHorseRaceStatsDto } from './repositories/horse-race-stat.repository';

const TICK_DURATION_MS = 500;

@Injectable()
export class RaceSimulationService {
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
  ) {}

  async runSimulation(raceId: string): Promise<{ message: string }> {
    // ── 1. Load + validate ────────────────────────────────────────────────────
    const race = await this.raceRepo.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    if (race.status !== RaceStatusEnum.READY) {
      throw new BadRequestException(
        `Race phải ở trạng thái "ready" mới có thể simulate (hiện tại: ${race.status})`,
      );
    }

    // FIX: null check cho raceCourseId trước khi toString()
    if (!race.raceCourseId) {
      throw new BadRequestException('Race chưa được gán RaceCourse');
    }

    const raceCourse = await this.raceCourseRepo.findById(
      race.raceCourseId.toString(),
    );
    if (!raceCourse) throw new NotFoundException('Không tìm thấy RaceCourse');

    const condition = await this.raceConditionRepo.findByRaceId(raceId);
    if (!condition) {
      throw new NotFoundException(
        'Chưa có RaceCondition — Referee cần nhập điều kiện trước',
      );
    }

    // ── 2. Load registrations đã confirmed (populate horse + jockeyProfile) ──
    const registrations =
      await this.registrationRepo.findConfirmedWithDetails(raceId);
    if (registrations.length < 2) {
      throw new BadRequestException(
        'Cần ít nhất 2 ngựa đã confirmed để chạy simulation',
      );
    }

    const raceObjectId = new Types.ObjectId(raceId);

    // ── 3. Build HorseInput ───────────────────────────────────────────────────
    const horseInputs: HorseInput[] = registrations.map((reg) => ({
      horseId: reg.horse._id,
      jockeyId: reg.jockeyProfile._id,
      lane: reg.gateNumber,
      horseWeight: reg.horse.weight,
      horseHeight: reg.horse.height,
      horseWinRate: reg.horse.winRate,
      jockeyWeight: reg.jockeyProfile.weight,
      totalWin: reg.horse.totalWin ?? 0,
    }));

    // ── 4. Tính stats + conditionModifier ────────────────────────────────────
    const horsesData: HorseEngineData[] = horseInputs.map((input) => ({
      horseId: input.horseId,
      jockeyId: input.jockeyId,
      lane: input.lane,
      totalWin: input.totalWin,
      stats: calcHorseRaceStats(input),
      conditionModifier: calcConditionModifier(
        condition,
        raceCourse,
        input.horseWeight,
      ),
    }));

    // ── 5. Generate ticks (độc lập từng ngựa) ────────────────────────────────
    const allTicks: ReturnType<typeof generateTicks>['ticks'] = [];
    const allEvents: ReturnType<typeof generateTicks>['events'] = [];
    const finishTickMap: Record<string, number> = {};

    for (const horse of horsesData) {
      const { ticks, events, finishTick } = generateTicks(raceObjectId, horse);
      allTicks.push(...ticks);
      allEvents.push(...events); // stumble + burst
      finishTickMap[horse.horseId.toString()] = finishTick;
    }

    // ── 6. Pass 2 — detect overtake + lead_change ────────────────────────────
    const horseIds = horsesData.map((h) => h.horseId);
    const passEvents = detectOvertakeAndLead(
      raceObjectId,
      horseIds,
      allTicks,
      finishTickMap,
    );
    allEvents.push(...passEvents);

    // ── 7. Tính rawRank từ finishTick (tăng dần) ─────────────────────────────
    const sortedByFinish = [...horsesData].sort(
      (a, b) =>
        finishTickMap[a.horseId.toString()] -
        finishTickMap[b.horseId.toString()],
    );

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

    // ── 8. Build HorseRaceStats snapshot ─────────────────────────────────────
    const statsSnapshots: CreateHorseRaceStatsDto[] = horsesData.map((h) => ({
      raceId: raceObjectId,
      horseId: h.horseId,
      jockeyId: h.jockeyId,
      totalLoad: h.stats.totalLoad,
      baseSpeed: h.stats.baseSpeed,
      acceleration: h.stats.acceleration,
      stamina: h.stats.stamina,
      totalWin: h.totalWin,
    }));

    // ── 9. Bulk insert trong transaction ─────────────────────────────────────
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        await this.raceTickRepo.bulkInsert(allTicks);
        await this.raceEventRepo.bulkInsert(allEvents);
        await this.rawResultRepo.bulkInsert(rawResults);
        await this.horseRaceStatsRepo.bulkInsert(statsSnapshots);
        await this.raceRepo.updateStatus(raceId, RaceStatusEnum.SIMULATED);
      });
    } finally {
      await session.endSession();
    }

    return {
      message: `Simulation hoàn thành. Tổng ${allTicks.length} ticks, ${allEvents.length} events.`,
    };
  }

  async getSimulationResult(raceId: string) {
    const results = await this.rawResultRepo.findByRaceId(raceId);
    const stats = await this.horseRaceStatsRepo.findByRaceId(raceId);
    const events = await this.raceEventRepo.findByRaceId(raceId);
    return { results, stats, events };
  }
}