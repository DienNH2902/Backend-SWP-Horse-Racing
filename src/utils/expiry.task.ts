import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JockeyInvitationRepository } from '../modules/invitation/invitation.repository';
import { JockeyInvitationEnum } from 'src/constants/jockeyInvitationEnum.enum';
import { TransactionRepository } from '../modules/payment/transaction.repository';
import { NotificationRepository } from '../modules/notification/notification.repository';
import { TransactionTypeEnum } from 'src/constants/transactionType.enum';
import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
import { JockeyProfile } from 'src/modules/user/schemas/jockey-profile.schema';
import { HorseOwnerProfile } from 'src/modules/user/schemas/horse-owner-profile.schema';

@Injectable()
export class InvitationExpiryTask {
  private readonly logger = new Logger(InvitationExpiryTask.name);
  private readonly EXPIRY_DAYS = 2;

  constructor(
    private readonly repo: JockeyInvitationRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly notificationRepository: NotificationRepository,
    @InjectModel(JockeyProfile.name)
    private readonly jockeyProfileModel: Model<JockeyProfile>,
    @InjectModel(HorseOwnerProfile.name)
    private readonly horseOwnerProfileModel: Model<HorseOwnerProfile>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiry() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.EXPIRY_DAYS);

    // 1. Tìm các lời mời đã quá hạn
    const expiredInvitations = await this.repo.findPendingOlderThan(cutoff);

    if (expiredInvitations.length === 0) return;

    const invitationIds = expiredInvitations.map((i) => i._id.toString());

    for (const invitation of expiredInvitations) {
      const ownerCompensationAmount =
        (invitation.proposeContractAmount * invitation.ownerCompensationRate) /
        100;
      const totalOwnerHeldAmount = (invitation.proposeContractAmount +
        ownerCompensationAmount) as number;

      // 2. TRỪ 5 ĐIỂM UY TÍN CỦA JOCKEY (Tối thiểu là 0)
      const jockey = await this.jockeyProfileModel.findOne({
        userId: new Types.ObjectId(invitation.jockeyId.toString()),
      });

      if (jockey) {
        const newPoints = Math.max(0, (jockey.reputationPoints || 0) - 5);
        await this.jockeyProfileModel.updateOne(
          { userId: new Types.ObjectId(invitation.jockeyId.toString()) },
          { $set: { reputationPoints: newPoints } },
        );
      }

      // 3. HOÀN LẠI TIỀN ĐÓNG BĂNG CHO OWNER
      await this.horseOwnerProfileModel.updateOne(
        { userId: new Types.ObjectId(invitation.horseOwnerId.toString()) },
        {
          $inc: {
            balance: totalOwnerHeldAmount,
            heldBalance: -totalOwnerHeldAmount,
          },
        },
      );

      // 4. GHI NHẬN LỊCH SỬ GIAO DỊCH HOÀN TIỀN CHO OWNER
      await this.transactionRepository.create({
        senderId: null,
        receiverId: new Types.ObjectId(invitation.horseOwnerId.toString()),
        content: `Hoàn trả tiền giải phóng ký quỹ do lời mời Jockey hết hạn phản hồi (${this.EXPIRY_DAYS} ngày). Số tiền: ${totalOwnerHeldAmount}`,
        amount: totalOwnerHeldAmount,
        type: TransactionTypeEnum.REFUND,
      });

      // 5. GỬI THÔNG BÁO CHO TRƯỜNG HỢP HẾT HẠN
      // Thông báo cho Owner
      await this.notificationRepository.create({
        userId: new Types.ObjectId(invitation.horseOwnerId.toString()),
        type: NotificationTypeEnum.INVITATION_REJECTED,
        title: NotificationTitleEnum.INVITATION_REJECTED,
        content: `Lời mời hợp tác gửi tới Jockey đã hết hạn phản hồi. Tiền ký quỹ đã được hoàn về ví khả dụng.`,
        isRead: false,
      });

      // Thông báo cảnh cáo cho Jockey
      await this.notificationRepository.create({
        userId: new Types.ObjectId(invitation.jockeyId.toString()),
        type: NotificationTypeEnum.INVITATION_REJECTED,
        title: NotificationTitleEnum.INVITATION_REJECTED,
        content: `Bạn đã để một lời mời thi đấu tự động hết hạn mà không phản hồi. Bạn bị trừ 5 điểm uy tín hệ thống.`,
        isRead: false,
      });
    }

    // 6. Cập nhật trạng thái loạt lời mời này thành EXPIRED trong DB
    const count = await this.repo.updateStatusMany(
      invitationIds,
      JockeyInvitationEnum.EXPIRED,
    );

    if (count > 0) {
      this.logger.log(
        `Đã xử lý hết hạn ${count} lời mời quá hạn và trừ điểm phạt các Jockey liên quan.`,
      );
    }
  }
}

// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { JockeyInvitationRepository } from '../modules/invitation/invitation.repository';

// /**
//  * Cron job tự động expire các invitation PENDING quá 2 ngày.
//  * Cần cài: yarn add @nestjs/schedule
//  * Thêm ScheduleModule.forRoot() vào AppModule.
//  */
// @Injectable()
// export class InvitationExpiryTask {
//   private readonly logger = new Logger(InvitationExpiryTask.name);
//   private readonly EXPIRY_DAYS = 2;

//   constructor(private readonly repo: JockeyInvitationRepository) {}

//   @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
//   async handleExpiry() {
//     const cutoff = new Date();
//     cutoff.setDate(cutoff.getDate() - this.EXPIRY_DAYS);

//     const count = await this.repo.expireOlderThan(cutoff);
//     if (count > 0) {
//       this.logger.log(
//         `Đã expire ${count} lời mời quá ${this.EXPIRY_DAYS} ngày`,
//       );
//     }
//   }
// }
