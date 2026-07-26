import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RaceTickRepository } from '../race-simulation/repositories/race-tick.repository';
import { RaceRepository } from '../race/race.repository';

@Injectable()
export class RaceTickCleanupService {
  private readonly logger = new Logger(RaceTickCleanupService.name);
  private readonly RETENTION_DAYS = 5;
  private readonly BATCH_SIZE = 10; // số race xử lý song song mỗi lượt

  constructor(
    private readonly raceTickRepo: RaceTickRepository,
    private readonly raceRepo: RaceRepository,
  ) {}

  // Chạy lúc 23:59 tối Chủ Nhật hàng tuần
  @Cron('59 23 * * 0', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async cleanupOldRaceTicks(): Promise<void> {
    this.logger.log('[CLEANUP] Bắt đầu xóa RaceTick cũ...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    const finishedRaces = await this.raceRepo.findFinishedBefore(cutoffDate);

    if (finishedRaces.length === 0) {
      this.logger.log('[CLEANUP] Không có race nào cần xóa tick');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const failedRaceIds: string[] = [];

    // Chia thành từng batch nhỏ, xử lý song song trong mỗi batch
    for (let i = 0; i < finishedRaces.length; i += this.BATCH_SIZE) {
      const batch = finishedRaces.slice(i, i + this.BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((race) => this.deleteTicksForRace(race)),
      );

      results.forEach((result, idx) => {
        const raceId = (batch[idx] as any)._id.toString();
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failCount++;
          failedRaceIds.push(raceId);
          this.logger.error(
            `[CLEANUP] Lỗi khi xóa ticks race ${raceId}: ${result.reason}`,
          );
        }
      });
    }

    this.logger.log(
      `[CLEANUP] Hoàn thành — thành công: ${successCount}, thất bại: ${failCount}` +
        (failedRaceIds.length > 0
          ? ` (race lỗi: ${failedRaceIds.join(', ')})`
          : ''),
    );
  }

  private async deleteTicksForRace(race: any): Promise<void> {
    const raceId = race._id.toString();
    try {
      await this.raceTickRepo.deleteByRaceId(raceId);
      this.logger.log(`[CLEANUP] Đã xóa ticks race ${raceId}`);
    } catch (error) {
      // Ném lại lỗi để Promise.allSettled bắt được ở tầng trên,
      // đồng thời giữ nguyên context raceId cho log
      throw error;
    }
  }
}