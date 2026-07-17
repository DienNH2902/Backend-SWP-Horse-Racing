import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
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
import { BetService } from '../bet/bet.service';
import { RegistrationRepository } from '../registration/registration.repository';
import { RaceStatusEnum } from 'src/constants/raceStatus.enum';
import { RaceRepository } from '../race/race.repository';
import { BreachActionTypeEnum } from 'src/constants/breachingTypeEnum.enum';
import { ContractDocument } from './schemas/contract.schema';
import { ContractBreachDocument } from './schemas/contractBreach.schema';
import { BreachStatusEnum } from 'src/constants/breachStatusEnum.enum';

@Injectable()
export class ContractBreachService {
  constructor(
    private readonly breachRepository: ContractBreachRepository,
    private readonly raceRepository: RaceRepository,
    private readonly betService: BetService,
    private readonly registrationRepository: RegistrationRepository,
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

  async reportBreach(userId: string, dto: CreateContractBreachDto) {
    const contract = await this.contractRepository.findById(dto.contractId);
    if (!contract)
      throw new NotFoundException('Không tìm thấy thông tin hợp đồng');

    if (contract.status === ContractStatusEnum.BREACHED) {
      throw new ConflictException(
        'Hợp đồng này đã được xử lý thanh lý vi phạm từ trước',
      );
    }

    if (contract.status === ContractStatusEnum.DISPUTED) {
      throw new ConflictException(
        'Hợp đồng này đang trong quá trình chờ Admin xử lý tranh chấp',
      );
    }

    // Trích xuất chính xác chuỗi ID của Owner và Jockey
    const ownerUserId =
      contract.horseOwnerId?._id?.toString() ||
      contract.horseOwnerId?.toString();
    const jockeyUserId =
      contract.jockeyId?._id?.toString() || contract.jockeyId?.toString();
    // Kiểm tra quyền truy cập hợp đồng này
    if (userId !== ownerUserId && userId !== jockeyUserId) {
      throw new ForbiddenException(
        'You do not have permission to access this contract',
      );
    }

    // 2. Kiểm tra logic phân quyền dựa trên actionType
    if (dto.actionType === BreachActionTypeEnum.SELF_CANCEL) {
      // Bên nào bấm hủy thì bên đó PHẢI là bên vi phạm
      if (
        userId === jockeyUserId &&
        dto.breachingParty !== BreachingPartyEnum.JOCKEY
      ) {
        throw new ForbiddenException(
          'Jockey can only self-cancel with JOCKEY as breaching party',
        );
      }

      if (
        userId === ownerUserId &&
        dto.breachingParty !== BreachingPartyEnum.HORSE_OWNER
      ) {
        throw new ForbiddenException(
          'Horse Owner can only self-cancel with HORSE_OWNER as breaching party',
        );
      }

      // LUỒNG TỰ HỦY: Thực thi cấn trừ tiền và khấu trừ điểm uy tín ngay lập tức
      return this.executeDirectBreachPayout(
        contract as ContractDocument,
        userId,
        dto,
      );
    } else if (dto.actionType === BreachActionTypeEnum.REPORT_OPPONENT) {
      //Chỉ được báo cáo bên còn lại vi phạm
      if (
        userId === jockeyUserId &&
        dto.breachingParty !== BreachingPartyEnum.HORSE_OWNER
      ) {
        throw new ForbiddenException(
          'Jockey can only report breach against Horse Owner',
        );
      }

      if (
        userId === ownerUserId &&
        dto.breachingParty !== BreachingPartyEnum.JOCKEY
      ) {
        throw new ForbiddenException(
          'Horse Owner can only report breach against Jockey',
        );
      }

      // LUỒNG TỐ CÁO ĐỐI PHƯƠNG: Tạo Yêu cầu chờ Admin duyệt, chưa trừ tiền
      return this.handleCreateBreachReportForAdmin(
        contract as ContractDocument,
        userId,
        dto,
      );
    }

    throw new BadRequestException('Loại hành động vi phạm không hợp lệ');
  }

  /**
   * TẠO BÁO CÁO VI PHẠM CHỜ ADMIN DUYỆT (Tố cáo đối phương)
   */
  private async handleCreateBreachReportForAdmin(
    contract: ContractDocument,
    reporterId: string,
    dto: CreateContractBreachDto,
  ) {
    const ownerUserId =
      contract.horseOwnerId?._id?.toString() ||
      contract.horseOwnerId?.toString();
    const jockeyUserId =
      contract.jockeyId?._id?.toString() || contract.jockeyId?.toString();
    const opponentUserId =
      reporterId === ownerUserId ? jockeyUserId : ownerUserId;

    // Chuyển hợp đồng sang trạng thái tranh chấp
    await this.contractRepository.updateStatus(
      dto.contractId,
      ContractStatusEnum.DISPUTED,
    );

    // Tính toán số tiền bồi thường dự kiến để lưu vết
    const contractAmount = contract.contractAmount;
    const finalCompensationAmount =
      dto.breachingParty === BreachingPartyEnum.HORSE_OWNER
        ? (contractAmount * contract.ownerCompensationRate) / 100
        : (contractAmount * contract.jockeyCompensationRate) / 100;

    // Tạo bản ghi tố cáo trạng thái PENDING
    const breachRecord = await this.breachRepository.create({
      contractId: new Types.ObjectId(dto.contractId),
      reporterId: new Types.ObjectId(reporterId),
      breachingParty: dto.breachingParty,
      actionType: dto.actionType,
      reason: dto.reason,
      compensationAmount: finalCompensationAmount,
      status: BreachStatusEnum.PENDING,
    });

    // Thông báo cho Người Tố Cáo
    await this.notificationRepository.create({
      userId: new Types.ObjectId(reporterId),
      type: NotificationTypeEnum.CONTRACT_BREACHED_SENT,
      title: NotificationTitleEnum.CONTRACT_BREACHED_SENT,
      content: `Yêu cầu tố cáo đối phương vi phạm hợp đồng của bạn đã được tiếp nhận và chuyển đến Quản trị viên xử lý.`,
      isRead: false,
    });

    // Thông báo cho Đối Phương bị tố cáo
    await this.notificationRepository.create({
      userId: new Types.ObjectId(opponentUserId),
      type: NotificationTypeEnum.CONTRACT_BREACHED_SENT,
      title: NotificationTitleEnum.CONTRACT_BREACHED_SENT,
      content: `Đối phương đã gửi đơn tố cáo vi phạm đối với hợp đồng ${dto.contractId}. Quản trị viên đang xem xét vụ việc này.`,
      isRead: false,
    });

    return {
      message:
        'Đơn tố cáo đối phương đã gửi thành công. Vui lòng chờ Admin kiểm tra và duyệt.',
      breach: breachRecord,
    };
  }

  /**
   * ADMIN XỬ LÝ DUYỆT HOẶC TỪ CHỐI ĐƠN TỐ CÁO
   */
  async processBreachReportByAdmin(
    breachId: string,
    isApproved: boolean,
    adminReason?: string,
  ) {
    const breach = await this.breachRepository.findById(breachId);
    if (!breach) {
      throw new NotFoundException('Không tìm thấy đơn tố cáo vi phạm');
    }

    if (breach.status !== BreachStatusEnum.PENDING) {
      throw new ConflictException('Đơn tố cáo này đã được xử lý trước đó');
    }

    const contract = await this.contractRepository.findById(
      breach.contractId.toString(),
    );
    if (!contract) {
      throw new NotFoundException(
        'Không tìm thấy thông tin hợp đồng liên quan',
      );
    }

    const reporterId = breach.reporterId.toString();
    const ownerUserId =
      contract.horseOwnerId?._id?.toString() ||
      contract.horseOwnerId?.toString();
    const jockeyUserId =
      contract.jockeyId?._id?.toString() || contract.jockeyId?.toString();
    const opponentUserId =
      reporterId === ownerUserId ? jockeyUserId : ownerUserId;

    if (!isApproved) {
      // TRƯỜNG HỢP ADMIN TỪ CHỐI TỐ CÁO (Không có thay đổi số dư / điểm uy tín)
      await this.breachRepository.updateStatus(
        breachId,
        BreachStatusEnum.REJECTED,
      );
      await this.contractRepository.updateStatus(
        contract._id.toString(),
        ContractStatusEnum.ACTIVE,
      );

      // Thông báo cho Người tố cáo
      await this.notificationRepository.create({
        userId: new Types.ObjectId(reporterId),
        type: NotificationTypeEnum.CONTRACT_BREACHED_SENT_REJECTED,
        title: NotificationTitleEnum.CONTRACT_BREACHED_SENT_REJECTED,
        content: `Đơn tố cáo vi phạm hợp đồng của bạn đã bị Admin từ chối.${adminReason ? ' Lý do: ' + adminReason : ''} Hợp đồng tiếp tục trạng thái hoạt động.`,
        isRead: false,
      });

      // Thông báo cho Đối phương
      await this.notificationRepository.create({
        userId: new Types.ObjectId(opponentUserId),
        type: NotificationTypeEnum.CONTRACT_BREACHED_SENT_REJECTED,
        title: NotificationTitleEnum.CONTRACT_BREACHED_SENT_REJECTED,
        content: `Đơn tố cáo vi phạm hợp đồng từ đối phương đã bị Admin từ chối. Hợp đồng trở lại trạng thái hoạt động bình thường.`,
        isRead: false,
      });

      return { message: 'Đã từ chối đơn tố cáo vi phạm hợp đồng.' };
    }

    // TRƯỜNG HỢP ADMIN PHÊ DUYỆT TỐ CÁO: Tiến hành cấn trừ tiền và điểm uy tín
    await this.breachRepository.updateStatus(
      breachId,
      BreachStatusEnum.APPROVED,
    );

    const dto: CreateContractBreachDto = {
      contractId: contract._id.toString(),
      breachingParty: breach.breachingParty,
      actionType: breach.actionType,
      reason: breach.reason,
    };

    return this.executeDirectBreachPayout(
      contract as ContractDocument,
      reporterId,
      dto,
    );
  }

  /**
   * THỰC THI TOÀN BỘ LOGIC CẤN TRỪ TIỀN, ĐIỂM UY TÍN VÀ HỦY CƯỢC LIÊN QUAN
   */
  private async executeDirectBreachPayout(
    contract: ContractDocument,
    reporterId: string,
    dto: CreateContractBreachDto,
  ) {
    const ownerUserId =
      contract.horseOwnerId?._id?.toString() ||
      contract.horseOwnerId?.toString();
    const jockeyUserId =
      contract.jockeyId?._id?.toString() || contract.jockeyId?.toString();
    const horseIdStr =
      contract.horseId?._id?.toString() || contract.horseId?.toString();

    const contractAmount = contract.contractAmount;
    const ownerCompensationLimit =
      (contractAmount * contract.ownerCompensationRate) / 100;
    const jockeyCompensationLimit =
      (contractAmount * contract.jockeyCompensationRate) / 100;

    let finalCompensationAmount = 0;

    // TÌNH HUỐNG 1: CHỦ NGỰA (OWNER) VI PHẠM ĐIỀU KHOẢN
    if (dto.breachingParty === BreachingPartyEnum.HORSE_OWNER) {
      finalCompensationAmount = ownerCompensationLimit;
      const systemCommission = finalCompensationAmount * 0.1;
      const jockeyReceived = finalCompensationAmount - systemCommission;

      const ownerProfile = await this.horseOwnerProfileModel.findOne({
        userId: new Types.ObjectId(ownerUserId),
      });
      const currentOwnerPoints = ownerProfile?.reputationPoints ?? 70;
      const newOwnerPoints = Math.max(0, currentOwnerPoints - 10);

      // Hoàn trả lại tiền thuê đã đóng băng cho Owner, trừ đi toàn bộ tiền ký quỹ đền bù
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

      // Cập nhật số dư và điểm uy tín chuẩn xác cho Jockey
      await this.jockeyProfileModel.updateOne(
        { userId: new Types.ObjectId(jockeyUserId) },
        {
          $inc: {
            balance: jockeyCompensationLimit + jockeyReceived,
            heldBalance: -jockeyCompensationLimit,
          },
        },
      );

      // Hệ thống thu 10% tiền phạt từ Owner vi phạm
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

      // Tạo Transaction ghi nhận dòng tiền phạt của Owner
      await this.transactionRepository.create({
        senderId: new Types.ObjectId(ownerUserId),
        receiverId: new Types.ObjectId(jockeyUserId),
        content: `Khấu trừ vi phạm hợp đồng: Phạt đền bù ${finalCompensationAmount} (Hệ thống thu 10%: ${systemCommission}, Jockey nhận 90%: ${jockeyReceived})`,
        amount: finalCompensationAmount,
        type: TransactionTypeEnum.PENALTY,
      });

      // Gửi Notification cảnh báo vi phạm
      await this.notificationRepository.create({
        userId: new Types.ObjectId(ownerUserId),
        type: NotificationTypeEnum.CONTRACT_BREACHED,
        title: NotificationTitleEnum.CONTRACT_BREACHED,
        content: `Bạn bị xác định vi phạm điều khoản hợp đồng. Bạn bị khấu trừ tiền phạt đền bù: ${ownerCompensationLimit}. Hoàn lại tiền thuê nài: ${contractAmount}`,
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
      const systemCommission = finalCompensationAmount * 0.1;
      const ownerReceived = finalCompensationAmount - systemCommission;

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

      // Hệ thống thu 10%
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

      // Gửi transaction
      await this.transactionRepository.create({
        senderId: new Types.ObjectId(jockeyUserId),
        receiverId: new Types.ObjectId(ownerUserId),
        content: `Khấu trừ vi phạm hợp đồng Jockey: Phạt đền bù ${finalCompensationAmount} (Hệ thống thu 10%: ${systemCommission}, Owner nhận 90%: ${ownerReceived})`,
        amount: finalCompensationAmount,
        type: TransactionTypeEnum.PENALTY,
      });

      // Gửi thông báo cho 2 bên
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

    // Đổi trạng thái Hợp đồng sang BREACHED
    await this.contractRepository.updateStatus(
      dto.contractId,
      ContractStatusEnum.BREACHED,
    );

    // LUỒNG PHỤ: HỦY CÁC CƯỢC LIÊN QUAN ĐẾN NGỰA BỊ VI PHẠM HỢP ĐỒNG
    const tournamentIdStr =
      contract.tournamentId?._id?.toString() ||
      contract.tournamentId?.toString();

    // Tìm Registration của ngựa này để lấy raceId
    const registration =
      await this.registrationRepository.findActiveByTournamentAndHorse(
        tournamentIdStr,
        horseIdStr,
      );

    if (registration) {
      const registrationIdStr = registration._id.toString();
      const rejectReason = 'Hủy đăng ký do vi phạm hoặc chấm dứt hợp đồng';

      await this.registrationRepository.updateStatusToRejected(
        registrationIdStr,
        rejectReason,
      );

      // Xử lý hoàn tiền cược nếu đơn đăng ký này đã được xếp vào trận đấu (có raceId)
      if (registration.raceId) {
        const raceIdStr =
          registration.raceId?._id?.toString() ||
          registration.raceId?.toString();

        const race = await this.raceRepository.findById(raceIdStr);
        if (!race) {
          throw new NotFoundException(
            `Không tìm thấy race với ID: ${raceIdStr}`,
          );
        } else if (race.status === RaceStatusEnum.SCHEDULED) {
          await this.betService.refundBetsForDisqualifiedHorse(
            raceIdStr,
            horseIdStr,
          );
        }
      }
    }
    // Kết thúc luồng phụ

    // Trả status ngựa về lại IDLE
    await this.horseRepository.updateHorseStatus(
      horseIdStr,
      HorseStatusEnum.IDLE,
    );

    let breachRecord;
    if (dto.actionType === BreachActionTypeEnum.SELF_CANCEL) {
      breachRecord = await this.breachRepository.create({
        contractId: new Types.ObjectId(dto.contractId),
        reporterId: new Types.ObjectId(reporterId),
        breachingParty: dto.breachingParty,
        actionType: dto.actionType,
        status: BreachStatusEnum.APPROVED,
        reason: dto.reason,
        compensationAmount: finalCompensationAmount,
        resolvedAt: new Date(),
      });
    }
    return (
      (breachRecord as ContractBreachDocument) || {
        message:
          'Giải quyết hợp đồng vi phạm, bôi thường và điểm uy tín thành công',
      }
    );
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

    // Lấy thông tin profile hiện tại để tính toán điểm uy tín giới hạn max 100
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

    // Thuật toán giới hạn trần 100 điểm uy tín
    const newOwnerPoints = Math.min(100, currentOwnerPoints + 15);
    const newJockeyPoints = Math.min(100, currentJockeyPoints + 15);

    // OWNER: Nhận lại tiền cọc đền bù cam kết của mình, mất tiền thuê jockey thực tế đã giải ngân
    await this.horseOwnerProfileModel.updateOne(
      { userId: new Types.ObjectId(ownerUserId) },
      {
        $inc: {
          balance: ownerCompensationLimit,
          heldBalance: -(contract.contractAmount + ownerCompensationLimit),
          reputationPoints: newOwnerPoints,
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
          reputationPoints: newJockeyPoints,
        },
      },
    );

    // 3. Tạo Transaction ghi nhận thanh toán giải ngân thành công từ Owner sang Jockey
    await this.transactionRepository.create({
      senderId: new Types.ObjectId(ownerUserId),
      receiverId: new Types.ObjectId(jockeyUserId),
      content: `Giải ngân hoàn tất hợp đồng thi đấu giải ${jockeyCompensationLimit}. Jockey nhận tiền công: ${contract.contractAmount}`,
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
      content: `Chúc mừng bạn đã hoàn thành giải đấu. Tiền công ${contract.contractAmount} và tiền cọc đền bù của bạn ${jockeyCompensationLimit} đã được cộng vào tài khoản khả dụng.`,
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
      message:
        'Hợp đồng hoàn thành tốt đẹp, đã hoàn lại tiền bồi thường cho cả hai bên!',
    };
  }

  // async reportBreach(userId: string, dto: CreateContractBreachDto) {
  //   const contract = await this.contractRepository.findById(dto.contractId);
  //   if (!contract)
  //     throw new NotFoundException('Không tìm thấy thông tin hợp đồng');
  //   if (contract.status === ContractStatusEnum.BREACHED) {
  //     throw new ConflictException(
  //       'Hợp đồng này đã được xử lý thanh lý vi phạm từ trước',
  //     );
  //   }

  //   // Trích xuất chính xác chuỗi ID của Owner và Jockey
  //   const ownerUserId =
  //     contract.horseOwnerId?._id?.toString() ||
  //     contract.horseOwnerId?.toString();
  //   const jockeyUserId =
  //     contract.jockeyId?._id?.toString() || contract.jockeyId?.toString();
  //   const horseIdStr =
  //     contract.horseId?._id?.toString() || contract.horseId?.toString();

  //   if (userId !== ownerUserId && userId !== jockeyUserId) {
  //     throw new ForbiddenException(
  //       'You do not have permission to access this contract',
  //     );
  //   }

  //   // 2. Kiểm tra logic phân quyền dựa trên actionType
  //   if (dto.actionType === BreachActionTypeEnum.SELF_CANCEL) {
  //     // LUỒNG TỰ HỦY: Bên nào bấm hủy thì bên đó PHẢI là bên vi phạm
  //     if (
  //       userId === jockeyUserId &&
  //       dto.breachingParty !== BreachingPartyEnum.JOCKEY
  //     ) {
  //       throw new ForbiddenException(
  //         'Jockey can only self-cancel with JOCKEY as breaching party',
  //       );
  //     }

  //     if (
  //       userId === ownerUserId &&
  //       dto.breachingParty !== BreachingPartyEnum.HORSE_OWNER
  //     ) {
  //       throw new ForbiddenException(
  //         'Horse Owner can only self-cancel with HORSE_OWNER as breaching party',
  //       );
  //     }
  //   } else if (dto.actionType === BreachActionTypeEnum.REPORT_OPPONENT) {
  //     // LUỒNG TỐ CÁO ĐỐI PHƯƠNG: Chỉ được báo cáo bên còn lại vi phạm
  //     if (
  //       userId === jockeyUserId &&
  //       dto.breachingParty !== BreachingPartyEnum.HORSE_OWNER
  //     ) {
  //       throw new ForbiddenException(
  //         'Jockey can only report breach against Horse Owner',
  //       );
  //     }

  //     if (
  //       userId === ownerUserId &&
  //       dto.breachingParty !== BreachingPartyEnum.JOCKEY
  //     ) {
  //       throw new ForbiddenException(
  //         'Horse Owner can only report breach against Jockey',
  //       );
  //     }
  //   }

  //   // Giá trị cốt lõi dòng tiền cấu thành
  //   const contractAmount = contract.contractAmount;
  //   const ownerCompensationLimit =
  //     (contractAmount * contract.ownerCompensationRate) / 100;
  //   const jockeyCompensationLimit =
  //     (contractAmount * contract.jockeyCompensationRate) / 100;

  //   let finalCompensationAmount = 0;

  //   // TÌNH HUỐNG 1: CHỦ NGỰA (OWNER) VI PHẠM ĐIỀU KHOẢN
  //   if (dto.breachingParty === BreachingPartyEnum.HORSE_OWNER) {
  //     finalCompensationAmount = ownerCompensationLimit;
  //     const systemCommission = finalCompensationAmount * 0.1; // Hệ thống thu về 10% hoa hồng trên tiền phạt
  //     const jockeyReceived = finalCompensationAmount - systemCommission; // Jockey thực nhận 90%

  //     // Hoàn trả lại tiền thuê đã đóng băng cho Owner, trừ đi toàn bộ tiền ký quỹ đền bù
  //     // await this.horseOwnerProfileModel.updateOne(
  //     //   { userId: new Types.ObjectId(ownerUserId) },
  //     //   {
  //     //     $inc: {
  //     //       balance: contractAmount,
  //     //       heldBalance: -(contractAmount + ownerCompensationLimit),
  //     //     },
  //     //   },
  //     // );

  //     const ownerProfile = await this.horseOwnerProfileModel.findOne({
  //       userId: new Types.ObjectId(ownerUserId),
  //     });
  //     const currentOwnerPoints = ownerProfile?.reputationPoints ?? 70;
  //     const newOwnerPoints = Math.max(0, currentOwnerPoints - 10);

  //     // Cập nhật số dư và điểm uy tín chuẩn xác
  //     await this.horseOwnerProfileModel.updateOne(
  //       { userId: new Types.ObjectId(ownerUserId) },
  //       {
  //         $inc: {
  //           balance: contractAmount,
  //           heldBalance: -(contractAmount + ownerCompensationLimit),
  //         },
  //         $set: {
  //           reputationPoints: newOwnerPoints,
  //         },
  //       },
  //     );

  //     // Giải phóng tiền đền bù của Jockey hoàn trả về ví khả dụng, kèm theo 90% tiền phạt nhận từ Owner
  //     await this.jockeyProfileModel.updateOne(
  //       { userId: new Types.ObjectId(jockeyUserId) },
  //       {
  //         $inc: {
  //           balance: jockeyCompensationLimit + jockeyReceived,
  //           heldBalance: -jockeyCompensationLimit,
  //         },
  //       },
  //     );

  //     // CẦN BỔ SUNG: Hệ thống thu 10% tiền phạt từ Owner vi phạm
  //     await this.systemWalletModel.updateOne(
  //       { walletName: 'SYSTEM_MAIN_WALLET' },
  //       {
  //         $inc: {
  //           balance: systemCommission,
  //           totalRevenue: systemCommission,
  //         },
  //       },
  //       { upsert: true },
  //     );

  //     // 3. Tạo Transaction ghi nhận dòng tiền phạt của Owner
  //     await this.transactionRepository.create({
  //       senderId: new Types.ObjectId(ownerUserId),
  //       receiverId: new Types.ObjectId(jockeyUserId),
  //       content: `Khấu trừ vi phạm hợp đồng: Phạt đền bù ${finalCompensationAmount} (Hệ thống thu 10%: ${systemCommission}, Jockey nhận 90%: ${jockeyReceived})`,
  //       amount: finalCompensationAmount,
  //       type: TransactionTypeEnum.PENALTY,
  //     });

  //     // 4. Gửi Notification cảnh báo vi phạm và đền bù cho đôi bên
  //     await this.notificationRepository.create({
  //       userId: new Types.ObjectId(ownerUserId),
  //       type: NotificationTypeEnum.CONTRACT_BREACHED,
  //       title: NotificationTitleEnum.CONTRACT_BREACHED,
  //       content: `Bạn đã vi phạm điều khoản hợp đồng. Bạn bị khấu trừ tiền phạt đền bù: ${ownerCompensationLimit}. Hoàn lại tiền thuê nài: ${contractAmount}`,
  //       isRead: false,
  //     });

  //     await this.notificationRepository.create({
  //       userId: new Types.ObjectId(jockeyUserId),
  //       type: NotificationTypeEnum.CONTRACT_BREACHED,
  //       title: NotificationTitleEnum.CONTRACT_BREACHED,
  //       content: `Chủ ngựa đã vi phạm hợp đồng. Bạn được hoàn trả tiền cọc đền bù cá nhân và nhận thêm bồi thường thực tế: ${jockeyReceived} (Sau khi trừ 10% phí hệ thống)`,
  //       isRead: false,
  //     });
  //   }
  //   // TÌNH HUỐNG 2: NÀI NGỰA (JOCKEY) TỰ Ý HỦY KÈO / VI PHẠM
  //   else {
  //     finalCompensationAmount = jockeyCompensationLimit;
  //     const systemCommission = finalCompensationAmount * 0.1; // Hệ thống trích thu 10% hoa hồng
  //     const ownerReceived = finalCompensationAmount - systemCommission; // Chủ ngựa thực nhận 90%

  //     // Hoàn trả lại tiền thuê + tiền đền bù của bản thân Owner về ví gốc, đồng thời nhận thêm 90% tiền phạt từ Jockey
  //     await this.horseOwnerProfileModel.updateOne(
  //       { userId: new Types.ObjectId(ownerUserId) },
  //       {
  //         $inc: {
  //           balance: contractAmount + ownerCompensationLimit + ownerReceived,
  //           heldBalance: -(contractAmount + ownerCompensationLimit),
  //         },
  //       },
  //     );

  //     // Jockey vi phạm: Mất trắng toàn bộ khoản ký quỹ đền bù nằm trong ví đóng băng
  //     // await this.jockeyProfileModel.updateOne(
  //     //   { userId: new Types.ObjectId(jockeyUserId) },
  //     //   {
  //     //     $inc: {
  //     //       heldBalance: -jockeyCompensationLimit,
  //     //     },
  //     //   },
  //     // );

  //     const jockeyProfile = await this.jockeyProfileModel.findOne({
  //       userId: new Types.ObjectId(jockeyUserId),
  //     });
  //     const currentJockeyPoints = jockeyProfile?.reputationPoints ?? 70;
  //     const newJockeyPoints = Math.max(0, currentJockeyPoints - 10);

  //     await this.jockeyProfileModel.updateOne(
  //       { userId: new Types.ObjectId(jockeyUserId) },
  //       {
  //         $inc: {
  //           heldBalance: -jockeyCompensationLimit,
  //         },
  //         $set: {
  //           reputationPoints: newJockeyPoints,
  //         },
  //       },
  //     );

  //     // CẦN BỔ SUNG: Hệ thống thu 10% tiền phạt từ Jockey vi phạm
  //     await this.systemWalletModel.updateOne(
  //       { walletName: 'SYSTEM_MAIN_WALLET' },
  //       {
  //         $inc: {
  //           balance: systemCommission,
  //           totalRevenue: systemCommission,
  //         },
  //       },
  //       { upsert: true },
  //     );

  //     // 3. Tạo Transaction xử lý dòng tiền vi phạm phạt từ phía Jockey
  //     await this.transactionRepository.create({
  //       senderId: new Types.ObjectId(jockeyUserId),
  //       receiverId: new Types.ObjectId(ownerUserId),
  //       content: `Khấu trừ vi phạm hợp đồng Jockey: Phạt đền bù ${finalCompensationAmount} (Hệ thống thu 10%: ${systemCommission}, Owner nhận 90%: ${ownerReceived})`,
  //       amount: finalCompensationAmount,
  //       type: TransactionTypeEnum.PENALTY,
  //     });

  //     // 4. Gửi Notification xử lý vi phạm
  //     await this.notificationRepository.create({
  //       userId: new Types.ObjectId(ownerUserId),
  //       type: NotificationTypeEnum.CONTRACT_BREACHED,
  //       title: NotificationTitleEnum.CONTRACT_BREACHED,
  //       content: `Jockey đã vi phạm điều khoản hợp đồng. Bạn được giải phóng toàn bộ tiền đóng băng và nhận bồi thường thực tế từ Jockey: ${ownerReceived} (Sau khi trừ 10% phí hệ thống)`,
  //       isRead: false,
  //     });

  //     await this.notificationRepository.create({
  //       userId: new Types.ObjectId(jockeyUserId),
  //       type: NotificationTypeEnum.CONTRACT_BREACHED,
  //       title: NotificationTitleEnum.CONTRACT_BREACHED,
  //       content: `Bạn bị xác định vi phạm hợp đồng. Hệ thống tịch thu toàn bộ khoản tiền ký quỹ đền bù của bạn: ${jockeyCompensationLimit}`,
  //       isRead: false,
  //     });
  //   }

  //   // 3. Đổi trạng thái thực thể
  //   await this.contractRepository.updateStatus(
  //     dto.contractId,
  //     ContractStatusEnum.BREACHED,
  //   );

  //   // ===== LUỒNG PHỤ: HỦY CÁC CƯỢC LIÊN QUAN ĐẾN NGỰA BỊ VI PHẠM HỢP ĐỒNG =====
  //   const tournamentIdStr =
  //     contract.tournamentId?._id?.toString() ||
  //     contract.tournamentId?.toString();

  //   // Tìm Registration của ngựa này để lấy raceId
  //   const registration =
  //     await this.registrationRepository.findActiveByTournamentAndHorse(
  //       tournamentIdStr,
  //       horseIdStr,
  //     );

  //   if (registration) {
  //     const registrationIdStr = registration._id.toString();
  //     const rejectReason = 'Hủy đăng ký do vi phạm hoặc chấm dứt hợp đồng';

  //     await this.registrationRepository.updateStatusToRejected(
  //       registrationIdStr,
  //       rejectReason,
  //     );

  //     // 2. Xử lý hoàn tiền cược nếu đơn đăng ký này đã được xếp vào trận đấu (có raceId)
  //     if (registration.raceId) {
  //       const raceIdStr =
  //         registration.raceId?._id?.toString() ||
  //         registration.raceId?.toString();

  //       const race = await this.raceRepository.findById(raceIdStr);
  //       if (!race) {
  //         throw new NotFoundException(
  //           `Không tìm thấy race với ID: ${raceIdStr}`,
  //         );
  //       } else if (race.status === RaceStatusEnum.SCHEDULED) {
  //         await this.betService.refundBetsForDisqualifiedHorse(
  //           raceIdStr,
  //           horseIdStr,
  //         );
  //       }
  //     }
  //   }
  //   // ===== KẾT THÚC LUỒNG PHỤ =====

  //   // const horseIdStr =
  //   //   contract.horseId?._id?.toString() || contract.horseId?.toString();
  //   await this.horseRepository.updateHorseStatus(
  //     horseIdStr,
  //     HorseStatusEnum.IDLE,
  //   );

  //   // 4. Lưu vết ghi nhận vi phạm pháp lý của hệ thống
  //   return this.breachRepository.create({
  //     contractId: new Types.ObjectId(dto.contractId),
  //     breachingParty: dto.breachingParty,
  //     reason: dto.reason,
  //     compensationAmount: finalCompensationAmount,
  //   });
  // }
}
