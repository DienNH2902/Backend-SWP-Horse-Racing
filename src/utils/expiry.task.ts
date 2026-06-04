import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JockeyInvitationRepository } from '../modules/invitation/invitation.repository';

/**
 * Cron job tự động expire các invitation PENDING quá 7 ngày.
 * Cần cài: npm i @nestjs/schedule
 * Thêm ScheduleModule.forRoot() vào AppModule.
 */
@Injectable()
export class InvitationExpiryTask {
  private readonly logger = new Logger(InvitationExpiryTask.name);
  private readonly EXPIRY_DAYS = 7;

  constructor(private readonly repo: JockeyInvitationRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiry() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.EXPIRY_DAYS);

    const count = await this.repo.expireOlderThan(cutoff);
    if (count > 0) {
      this.logger.log(
        `Đã expire ${count} lời mời quá ${this.EXPIRY_DAYS} ngày`,
      );
    }
  }
}
