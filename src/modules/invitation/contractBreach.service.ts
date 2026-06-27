import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ContractRepository } from '../invitation/contract.repository';
import { CreateContractBreachDto } from './dto/create-contract-breach.dto';
import { ContractStatusEnum } from 'src/constants/contractStatusEnum.enum';
import { BreachingPartyEnum } from 'src/constants/breachingPartyEnum.enum';
import { ContractBreachRepository } from './contractBreach.repository';
import {
  HorseOwnerProfile,
  HorseOwnerProfileDocument,
} from '../user/schemas/horse-owner-profile.schema';
import { JockeyProfile } from '../user/schemas/jockey-profile.schema';
import { HorseRepository } from '../horse/horse.repository';
import { HorseStatusEnum } from 'src/constants/horseStatusEnum.enum';
import { NotificationRepository } from '../notification/notification.repository';
import { TransactionRepository } from '../payment/transaction.repository';
import { TransactionTypeEnum } from 'src/constants/transactionType.enum';
import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
import {
  SystemWallet,
  SystemWalletDocument,
} from '../payment/schemas/systemWallet.schema';

@Injectable()
export class ContractBreachService {
  constructor(
    private readonly breachRepository: ContractBreachRepository,
    private readonly contractRepository: ContractRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly horseRepository: HorseRepository,
    @InjectModel(HorseOwnerProfile.name)
    private readonly horseOwnerProfileModel: Model<HorseOwnerProfileDocument>,
    @InjectModel(JockeyProfile.name)
    private readonly jockeyProfileModel: Model<JockeyProfile>,
    @InjectModel(SystemWallet.name)
    private readonly systemWalletModel: Model<SystemWalletDocument>,
  ) {}

  async reportBreach(dto: CreateContractBreachDto) {
    const contract = await this.contractRepository.findById(dto.contractId);
    if (!contract)
      throw new NotFoundException('Không tìm thấy thông tin hợp đồng');
    if (contract.status === ContractStatusEnum.BREACHED) {
      throw new ConflictException(
        'Hợp đồng này đã được xử lý thanh lý vi phạm từ trước',
      );
    }

    // Trích xuất chính xác chuỗi ID của Owner và Jockey
    const ownerUserId =
      contract.horseOwnerId?._id?.toString() ||
      contract.horseOwnerId?.toString();
    const jockeyUserId =
      contract.jockeyId?._id?.toString() || contract.jockeyId?.toString();

    // Giá trị cốt lõi dòng tiền cấu thành
    const contractAmount = contract.contractAmount;
    const ownerCompensationLimit =
      (contractAmount * contract.ownerCompensationRate) / 100;
    const jockeyCompensationLimit =
      (contractAmount * contract.jockeyCompensationRate) / 100;

    let finalCompensationAmount = 0;

    // TÌNH HUỐNG 1: CHỦ NGỰA (OWNER) VI PHẠM ĐIỀU KHOẢN
    if (dto.breachingParty === BreachingPartyEnum.HORSE_OWNER) {
      finalCompensationAmount = ownerCompensationLimit;
      const systemCommission = finalCompensationAmount * 0.1; // Hệ thống thu về 10% hoa hồng trên tiền phạt
      const jockeyReceived = finalCompensationAmount - systemCommission; // Jockey thực nhận 90%

      // Hoàn trả lại tiền thuê đã đóng băng cho Owner, trừ đi toàn bộ tiền ký quỹ đền bù
      // await this.horseOwnerProfileModel.updateOne(
      //   { userId: new Types.ObjectId(ownerUserId) },
      //   {
      //     $inc: {
      //       balance: contractAmount,
      //       heldBalance: -(contractAmount + ownerCompensationLimit),
      //     },
      //   },
      // );

      const ownerProfile = await this.horseOwnerProfileModel.findOne({
        userId: new Types.ObjectId(ownerUserId),
      });
      const currentOwnerPoints = ownerProfile?.reputationPoints ?? 70;
      const newOwnerPoints = Math.max(0, currentOwnerPoints - 10);

      // Cập nhật số dư và điểm uy tín chuẩn xác
      await this.horseOwnerProfileModel.updateOne(
        { userId: new Types.ObjectId(ownerUserId) },
        {
          $inc: {
            balance: contractAmount,
            heldBalance: -(contractAmount + ownerCompensationLimit),
          },
          $set: {
            reputationPoints: newOwnerPoints,
          },
        },
      );

      // Giải phóng tiền đền bù của Jockey hoàn trả về ví khả dụng, kèm theo 90% tiền phạt nhận từ Owner
      await this.jockeyProfileModel.updateOne(
        { userId: new Types.ObjectId(jockeyUserId) },
        {
          $inc: {
            balance: jockeyCompensationLimit + jockeyReceived,
            heldBalance: -jockeyCompensationLimit,
          },
        },
      );

      // CẦN BỔ SUNG: Hệ thống thu 10% tiền phạt từ Owner vi phạm
      await this.systemWalletModel.updateOne(
        { walletName: 'SYSTEM_MAIN_WALLET' },
        {
          $inc: {
            balance: systemCommission,
            totalRevenue: systemCommission,
          },
        },
        { upsert: true },
      );

      // 3. Tạo Transaction ghi nhận dòng tiền phạt của Owner
      await this.transactionRepository.create({
        senderId: new Types.ObjectId(ownerUserId),
        receiverId: new Types.ObjectId(jockeyUserId),
        content: `Khấu trừ vi phạm hợp đồng: Phạt đền bù ${finalCompensationAmount} (Hệ thống thu 10%: ${systemCommission}, Jockey nhận 90%: ${jockeyReceived})`,
        amount: finalCompensationAmount,
        type: TransactionTypeEnum.PENALTY,
      });

      // 4. Gửi Notification cảnh báo vi phạm và đền bù cho đôi bên
      await this.notificationRepository.create({
        userId: new Types.ObjectId(ownerUserId),
        type: NotificationTypeEnum.CONTRACT_BREACHED,
        title: NotificationTitleEnum.CONTRACT_BREACHED,
        content: `Bạn đã vi phạm điều khoản hợp đồng. Bạn bị khấu trừ tiền phạt đền bù: ${ownerCompensationLimit}. Hoàn lại tiền thuê nài: ${contractAmount}`,
        isRead: false,
      });

      await this.notificationRepository.create({
        userId: new Types.ObjectId(jockeyUserId),
        type: NotificationTypeEnum.CONTRACT_BREACHED,
        title: NotificationTitleEnum.CONTRACT_BREACHED,
        content: `Chủ ngựa đã vi phạm hợp đồng. Bạn được hoàn trả tiền cọc đền bù cá nhân và nhận thêm bồi thường thực tế: ${jockeyReceived} (Sau khi trừ 10% phí hệ thống)`,
        isRead: false,
      });
    }
    // TÌNH HUỐNG 2: NÀI NGỰA (JOCKEY) TỰ Ý HỦY KÈO / VI PHẠM
    else {
      finalCompensationAmount = jockeyCompensationLimit;
      const systemCommission = finalCompensationAmount * 0.1; // Hệ thống trích thu 10% hoa hồng
      const ownerReceived = finalCompensationAmount - systemCommission; // Chủ ngựa thực nhận 90%

      // Hoàn trả lại tiền thuê + tiền đền bù của bản thân Owner về ví gốc, đồng thời nhận thêm 90% tiền phạt từ Jockey
      await this.horseOwnerProfileModel.updateOne(
        { userId: new Types.ObjectId(ownerUserId) },
        {
          $inc: {
            balance: contractAmount + ownerCompensationLimit + ownerReceived,
            heldBalance: -(contractAmount + ownerCompensationLimit),
          },
        },
      );

      // Jockey vi phạm: Mất trắng toàn bộ khoản ký quỹ đền bù nằm trong ví đóng băng
      // await this.jockeyProfileModel.updateOne(
      //   { userId: new Types.ObjectId(jockeyUserId) },
      //   {
      //     $inc: {
      //       heldBalance: -jockeyCompensationLimit,
      //     },
      //   },
      // );

      const jockeyProfile = await this.jockeyProfileModel.findOne({
        userId: new Types.ObjectId(jockeyUserId),
      });
      const currentJockeyPoints = jockeyProfile?.reputationPoints ?? 70;
      const newJockeyPoints = Math.max(0, currentJockeyPoints - 10);

      await this.jockeyProfileModel.updateOne(
        { userId: new Types.ObjectId(jockeyUserId) },
        {
          $inc: {
            heldBalance: -jockeyCompensationLimit,
          },
          $set: {
            reputationPoints: newJockeyPoints,
          },
        },
      );

      // CẦN BỔ SUNG: Hệ thống thu 10% tiền phạt từ Jockey vi phạm
      await this.systemWalletModel.updateOne(
        { walletName: 'SYSTEM_MAIN_WALLET' },
        {
          $inc: {
            balance: systemCommission,
            totalRevenue: systemCommission,
          },
        },
        { upsert: true },
      );

      // 3. Tạo Transaction xử lý dòng tiền vi phạm phạt từ phía Jockey
      await this.transactionRepository.create({
        senderId: new Types.ObjectId(jockeyUserId),
        receiverId: new Types.ObjectId(ownerUserId),
        content: `Khấu trừ vi phạm hợp đồng Jockey: Phạt đền bù ${finalCompensationAmount} (Hệ thống thu 10%: ${systemCommission}, Owner nhận 90%: ${ownerReceived})`,
        amount: finalCompensationAmount,
        type: TransactionTypeEnum.PENALTY,
      });

      // 4. Gửi Notification xử lý vi phạm
      await this.notificationRepository.create({
        userId: new Types.ObjectId(ownerUserId),
        type: NotificationTypeEnum.CONTRACT_BREACHED,
        title: NotificationTitleEnum.CONTRACT_BREACHED,
        content: `Jockey đã vi phạm điều khoản hợp đồng. Bạn được giải phóng toàn bộ tiền đóng băng và nhận bồi thường thực tế từ Jockey: ${ownerReceived} (Sau khi trừ 10% phí hệ thống)`,
        isRead: false,
      });

      await this.notificationRepository.create({
        userId: new Types.ObjectId(jockeyUserId),
        type: NotificationTypeEnum.CONTRACT_BREACHED,
        title: NotificationTitleEnum.CONTRACT_BREACHED,
        content: `Bạn bị xác định vi phạm hợp đồng. Hệ thống tịch thu toàn bộ khoản tiền ký quỹ đền bù của bạn: ${jockeyCompensationLimit}`,
        isRead: false,
      });
    }

    // 3. Đổi trạng thái thực thể
    await this.contractRepository.updateStatus(
      dto.contractId,
      ContractStatusEnum.BREACHED,
    );

    const horseIdStr =
      contract.horseId?._id?.toString() || contract.horseId?.toString();
    await this.horseRepository.updateHorseStatus(
      horseIdStr,
      HorseStatusEnum.IDLE,
    );

    // 4. Lưu vết ghi nhận vi phạm pháp lý của hệ thống
    return this.breachRepository.create({
      contractId: new Types.ObjectId(dto.contractId),
      breachingParty: dto.breachingParty,
      reason: dto.reason,
      compensationAmount: finalCompensationAmount,
    });
  }

  // Phương thức nghiệp vụ bổ sung: Thanh lý hợp đồng hoàn thành tốt đẹp (Hết giải đấu)
  async completeContract(contractId: string) {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract || contract.status !== ContractStatusEnum.ACTIVE) {
      throw new BadRequestException(
        'Hợp đồng không tồn tại hoặc không ở trạng thái hoạt động để kết thúc tốt đẹp',
      );
    }

    // Trích xuất chính xác chuỗi ID của Owner và Jockey
    const ownerUserId =
      contract.horseOwnerId?._id?.toString() ||
      contract.horseOwnerId?.toString();
    const jockeyUserId =
      contract.jockeyId?._id?.toString() || contract.jockeyId?.toString();

    const ownerCompensationLimit =
      (contract.contractAmount * contract.ownerCompensationRate) / 100;
    const jockeyCompensationLimit =
      (contract.contractAmount * contract.jockeyCompensationRate) / 100;

    // OWNER: Nhận lại tiền cọc đền bù cam kết của mình, mất tiền thuê jockey thực tế đã giải ngân
    await this.horseOwnerProfileModel.updateOne(
      { userId: new Types.ObjectId(ownerUserId) },
      {
        $inc: {
          balance: ownerCompensationLimit,
          heldBalance: -(contract.contractAmount + ownerCompensationLimit),
        },
      },
    );

    // JOCKEY: Nhận lại tiền đền bù cọc của mình + nhận tiền công thi đấu (contractAmount) từ chủ ngựa
    await this.jockeyProfileModel.updateOne(
      { userId: new Types.ObjectId(jockeyUserId) },
      {
        $inc: {
          balance: contract.contractAmount + jockeyCompensationLimit,
          heldBalance: -jockeyCompensationLimit,
        },
      },
    );

    // 3. Tạo Transaction ghi nhận thanh toán giải ngân thành công từ Owner sang Jockey
    await this.transactionRepository.create({
      senderId: new Types.ObjectId(ownerUserId),
      receiverId: new Types.ObjectId(jockeyUserId),
      content: `Giải ngân hoàn tất hợp đồng thi đấu giải. Jockey nhận tiền công: ${contract.contractAmount}`,
      amount: contract.contractAmount,
      type: TransactionTypeEnum.PRIZE_PAYOUT, // Đảm bảo đúng enum payout hệ thống của bạn
    });

    // 4. Gửi thông báo hoàn thành đến cả 2 tài khoản
    await this.notificationRepository.create({
      userId: new Types.ObjectId(ownerUserId),
      type: NotificationTypeEnum.CONTRACT_COMPLETED,
      title: NotificationTitleEnum.CONTRACT_COMPLETED,
      content: `Giải đấu kết thúc tốt đẹp. Hợp đồng hoàn thành, tiền ký quỹ đền bù ${ownerCompensationLimit} đã quay lại ví khả dụng của bạn.`,
      isRead: false,
    });

    await this.notificationRepository.create({
      userId: new Types.ObjectId(jockeyUserId),
      type: NotificationTypeEnum.CONTRACT_COMPLETED,
      title: NotificationTitleEnum.CONTRACT_COMPLETED,
      content: `Chúc mừng bạn đã hoàn thành giải đấu. Tiền công ${contract.contractAmount} và tiền cọc đền bù của bạn đã được cộng vào tài khoản khả dụng.`,
      isRead: false,
    });

    await this.contractRepository.updateStatus(
      contractId,
      ContractStatusEnum.COMPLETED,
    );

    const horseIdStr =
      contract.horseId?._id?.toString() || contract.horseId?.toString();
    await this.horseRepository.updateHorseStatus(
      horseIdStr,
      HorseStatusEnum.IDLE,
    );

    return {
      message: 'Hợp đồng hoàn thành tốt đẹp!',
    };
  }
}
