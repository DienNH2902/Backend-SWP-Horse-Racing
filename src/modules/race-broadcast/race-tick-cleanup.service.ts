import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RaceTickRepository } from '../race-simulation/repositories/race-tick.repository';
import { RaceRepository } from '../race/race.repository';

@Injectable()
export class RaceTickCleanupService {
  private readonly logger = new Logger(RaceTickCleanupService.name);
  private readonly RETENTION_DAYS = 5;

  constructor(
    private readonly raceTickRepo: RaceTickRepository,
    private readonly raceRepo: RaceRepository,
  ) {}

  // Chạy lúc 2:00 AM mỗi ngày
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldRaceTicks(): Promise<void> {
    this.logger.log('[CLEANUP] Bắt đầu xóa RaceTick cũ...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    const finishedRaces = await this.raceRepo.findFinishedBefore(cutoffDate);

    if (finishedRaces.length === 0) {
      this.logger.log('[CLEANUP] Không có race nào cần xóa tick');
      return;
    }

    let totalDeleted = 0;
    for (const race of finishedRaces) {
      const raceId = (race as any)._id.toString();
      await this.raceTickRepo.deleteByRaceId(raceId);
      totalDeleted++;
      this.logger.log(`[CLEANUP] Đã xóa ticks race ${raceId}`);
    }

    this.logger.log(
      `[CLEANUP] Hoàn thành — xóa ticks của ${totalDeleted} races`,
    );
  }
}