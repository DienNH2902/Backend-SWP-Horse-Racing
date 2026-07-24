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
import { HorseRepository } from 'src/modules/horse/horse.repository';
import { ContractRepository } from 'src/modules/invitation/contract.repository';
import { ContractStatusEnum } from 'src/constants/contractStatusEnum.enum';
import { HorseStatusEnum } from 'src/constants/horseStatusEnum.enum';

@Injectable()
export class InvitationExpiryTask {
  private readonly logger = new Logger(InvitationExpiryTask.name);
  private readonly EXPIRY_DAYS = 2;
  private readonly EXPIRY_COMPLETE_CONTRACTS_DAYS = 2;

  constructor(
    private readonly repo: JockeyInvitationRepository,
    private readonly contractRepository: ContractRepository,
    private readonly horseRepository: HorseRepository,
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
  /**
   * 2. CRONJOB TỰ ĐỘNG HOÀN THÀNH HỢP ĐỒNG NẾU ADMIN KHÔNG BẤM COMPLETED SAU 2 NGÀY
   */
  private resolveId(field: any): string {
    return field?._id?.toString() || field?.toString();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoCompleteContracts() {
    const cutoff = new Date();
    // Tính mốc thời gian: Ngày kết thúc giải phải < (Hiện tại - 2 ngày)
    cutoff.setDate(cutoff.getDate() - this.EXPIRY_COMPLETE_CONTRACTS_DAYS);

    const activeContracts =
      await this.contractRepository.findActiveContractsExpiredAfterTournament(
        cutoff,
      );

    if (activeContracts.length === 0) return;

    for (const contract of activeContracts) {
      const contractId = this.resolveId(contract._id);

      const ownerUserId =
        this.resolveId(contract.horseOwnerId?._id) ||
        this.resolveId(contract.horseOwnerId);

      const jockeyUserId =
        this.resolveId(contract.jockeyId?._id) ||
        this.resolveId(contract.jockeyId);

      const ownerCompensationLimit =
        (contract.contractAmount * contract.ownerCompensationRate) / 100;
      const jockeyCompensationLimit =
        (contract.contractAmount * contract.jockeyCompensationRate) / 100;

      // Lấy profile hiện tại để tính toán điểm uy tín giới hạn trần 100
      const [ownerProfile, jockeyProfile] = await Promise.all([
        this.horseOwnerProfileModel.findOne({
          userId: new Types.ObjectId(ownerUserId),
        }),
        this.jockeyProfileModel.findOne({
          userId: new Types.ObjectId(jockeyUserId),
        }),
      ]);

      const currentOwnerPoints = ownerProfile?.reputationPoints ?? 0;
      const currentJockeyPoints = jockeyProfile?.reputationPoints ?? 0;

      const newOwnerPoints = Math.min(100, currentOwnerPoints + 15);
      const newJockeyPoints = Math.min(100, currentJockeyPoints + 15);

      // Cập nhật ví & điểm uy tín Owner
      await this.horseOwnerProfileModel.updateOne(
        { userId: new Types.ObjectId(ownerUserId) },
        {
          $inc: {
            balance: ownerCompensationLimit,
            heldBalance: -(contract.contractAmount + ownerCompensationLimit),
          },
          $set: {
            reputationPoints: newOwnerPoints,
          },
        },
      );

      // Cập nhật ví & điểm uy tín Jockey
      await this.jockeyProfileModel.updateOne(
        { userId: new Types.ObjectId(jockeyUserId) },
        {
          $inc: {
            balance: contract.contractAmount + jockeyCompensationLimit,
            heldBalance: -jockeyCompensationLimit,
          },
          $set: {
            reputationPoints: newJockeyPoints,
          },
        },
      );

      // Ghi nhận Transaction
      await this.transactionRepository.create({
        senderId: new Types.ObjectId(ownerUserId),
        receiverId: new Types.ObjectId(jockeyUserId),
        content: `Tự động giải ngân hoàn tất hợp đồng (quá 2 ngày sau khi giải đấu kết thúc). Jockey nhận tiền công: ${contract.contractAmount}`,
        amount: contract.contractAmount as number,
        type: TransactionTypeEnum.PRIZE_PAYOUT,
      });

      // Thông báo cho Owner
      await this.notificationRepository.create({
        userId: new Types.ObjectId(ownerUserId),
        type: NotificationTypeEnum.CONTRACT_COMPLETED,
        title: NotificationTitleEnum.CONTRACT_COMPLETED,
        content: `Giải đấu đã kết thúc quá 2 ngày. Hợp đồng tự động hoàn tất, tiền ký quỹ đền bù ${ownerCompensationLimit} đã quay lại ví khả dụng của bạn.`,
        isRead: false,
      });

      // Thông báo cho Jockey
      await this.notificationRepository.create({
        userId: new Types.ObjectId(jockeyUserId),
        type: NotificationTypeEnum.CONTRACT_COMPLETED,
        title: NotificationTitleEnum.CONTRACT_COMPLETED,
        content: `Giải đấu đã kết thúc quá 2 ngày. Hợp đồng tự động hoàn tất, tiền công ${contract.contractAmount} và tiền cọc đền bù ${jockeyCompensationLimit} đã được cộng vào tài khoản khả dụng.`,
        isRead: false,
      });

      // Cập nhật trạng thái Contract & Horse
      await this.contractRepository.updateStatus(
        contractId,
        ContractStatusEnum.COMPLETED,
      );
      console.log(contractId);

      const horseIdStr =
        this.resolveId(contract.horseId?._id) ||
        this.resolveId(contract.horseId);

      if (horseIdStr) {
        await this.horseRepository.updateHorseStatus(
          horseIdStr,
          HorseStatusEnum.IDLE,
        );
      }
    }

    this.logger.log(
      `Tự động hoàn tất và giải ngân cho ${activeContracts.length} hợp đồng quá 2 ngày sau khi giải đấu kết thúc.`,
    );
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
