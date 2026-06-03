import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { RegistrationRepository } from './registration.repository';
import { JockeyInvitationRepository } from '../invitation/invitation.repository';
import { ContractRepository } from '../invitation/contract.repository';
import { TournamentRepository } from '../tournament/tournament.repository';
// import { TransactionRepository } from '../transaction/transaction.repository';
// import { NotificationRepository } from '../notification/notification.repository';
import {
  HorseOwnerProfile,
  HorseOwnerProfileDocument,
} from '../user/schemas/horse-owner-profile.schema';
import { RegistrationStatusEnum } from 'src/constants/registrationStatus.enum';
// import { TransactionTypeEnum } from 'src/constants/transactionType.enum';
import { JockeyInvitationEnum } from 'src/constants/jockeyInvitationEnum.enum';
import { ContractStatusEnum } from 'src/constants/contractStatusEnum.enum';
import {
  CreateRegistrationDto,
  ApproveRegistrationDto,
  RejectRegistrationDto,
  ResponseRegistrationDto,
} from './dto';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly invitationRepository: JockeyInvitationRepository,
    private readonly contractRepository: ContractRepository,
    private readonly tournamentRepository: TournamentRepository,
    // private readonly transactionRepository: TransactionRepository,
    // private readonly notificationRepository: NotificationRepository,

    @InjectModel(HorseOwnerProfile.name)
    private readonly horseOwnerProfileModel: Model<HorseOwnerProfileDocument>,
  ) {}

  // ─── Helpers ───
  private toResponse(data: any): ResponseRegistrationDto {
    return plainToInstance(ResponseRegistrationDto, data, {
      excludeExtraneousValues: true,
    });
  }

  private resolveId(field: any): string {
    return field?._id?.toString() || field?.toString();
  }

  // HorseOwner tạo Registration
  async createRegistration(
    dto: CreateRegistrationDto,
    requesterId: string,
  ): Promise<ResponseRegistrationDto> {
    // 1. Verify invitation tồn tại và status = ACCEPTED
    const invitation = await this.invitationRepository.findById(
      dto.jockeyInvitationId,
    );
    if (!invitation) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }
    if (invitation.status !== JockeyInvitationEnum.ACCEPTED) {
      throw new BadRequestException(
        'Lời mời chưa được jockey chấp nhận, không thể đăng ký',
      );
    }

    // Chỉ horseOwner của invitation mới được tạo registration
    const ownerIdStr = this.resolveId(invitation.horseOwnerId);
    if (ownerIdStr !== requesterId) {
      throw new ForbiddenException(
        'Bạn không có quyền tạo đăng ký cho lời mời này',
      );
    }

    // 2. Verify contract tương ứng status = ACTIVE thông qua phương thức nghiệp vụ của repo
    const contract = await this.contractRepository.findByInvitationId(
      dto.jockeyInvitationId,
    );
    if (!contract || contract.status !== ContractStatusEnum.ACTIVE) {
      throw new BadRequestException(
        'Không tìm thấy hợp đồng active cho lời mời này',
      );
    }

    // 3. Lấy entryFee từ Tournament
    const tournamentIdStr = this.resolveId(invitation.tournamentId);
    const tournament =
      await this.tournamentRepository.findTournamentById(tournamentIdStr);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu');
    }
    const entryFee = tournament.entryFee;

    // 4. Check balance >= entryFee
    const ownerProfile = await this.horseOwnerProfileModel
      .findOne({ userId: new Types.ObjectId(requesterId) })
      .lean();
    if (!ownerProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ chủ ngựa');
    }
    if (ownerProfile.balance < entryFee) {
      throw new BadRequestException(
        `Số dư không đủ. Số dư hiện tại: ${ownerProfile.balance}, phí đăng ký: ${entryFee}`,
      );
    }

    // 5. Check chưa có registration active cho (tournamentId, horseId)
    const existing =
      await this.registrationRepository.findActiveByTournamentAndHorse(
        tournamentIdStr,
        this.resolveId(invitation.horseId),
      );
    if (existing) {
      throw new ConflictException(
        'Ngựa này đã được đăng ký trong giải đấu, không thể đăng ký trùng',
      );
    }

    // 6. Insert Registration
    const registration = await this.registrationRepository.create({
      jockeyInvitationId: new Types.ObjectId(dto.jockeyInvitationId),
      tournamentId: invitation.tournamentId,
      horseId: invitation.horseId,
      jockeyId: invitation.jockeyId,
      ownerId: invitation.horseOwnerId,
      entryFee,
      status: RegistrationStatusEnum.PENDING,
      registeredAt: new Date(),
    });

    return this.toResponse(registration);
  }

  // HorseOwner xem registration của mình
  async getMyRegistrations(
    ownerId: string,
    tournamentId?: string,
  ): Promise<ResponseRegistrationDto[]> {
    const list = await this.registrationRepository.findByOwnerId(
      ownerId,
      tournamentId,
    );
    return list.map((r) => this.toResponse(r));
  }

  async getRegistrationById(
    id: string,
    requesterId: string,
  ): Promise<ResponseRegistrationDto> {
    const reg = await this.registrationRepository.findById(id);
    if (!reg) throw new NotFoundException('Không tìm thấy đăng ký');
    const ownerIdStr = this.resolveId(reg.ownerId);
    if (ownerIdStr !== requesterId) {
      throw new ForbiddenException('Bạn không có quyền xem đăng ký này');
    }
    return this.toResponse(reg);
  }

  // Admin xem danh sách
  async adminGetAll(filters: {
    status?: string;
    tournamentId?: string;
  }): Promise<ResponseRegistrationDto[]> {
    const query: Record<string, any> = {};
    if (filters.status) query.status = filters.status;
    if (filters.tournamentId) {
      query.tournamentId = new Types.ObjectId(filters.tournamentId);
    }
    const list = await this.registrationRepository.findAll(query);
    return list.map((r) => this.toResponse(r));
  }

  async adminGetById(id: string): Promise<ResponseRegistrationDto> {
    const reg = await this.registrationRepository.findById(id);
    if (!reg) throw new NotFoundException('Không tìm thấy đăng ký');
    return this.toResponse(reg);
  }

  // Admin confirm — assign gateNumber, trừ tiền
  async adminConfirm(
    id: string,
    dto: ApproveRegistrationDto,
  ): Promise<ResponseRegistrationDto> {
    // 1. Check registration status
    const reg = await this.registrationRepository.findById(id);
    if (!reg) throw new NotFoundException('Không tìm thấy đăng ký');
    if (reg.status !== RegistrationStatusEnum.WAITLISTED) {
      throw new ConflictException(
        `Đăng ký đang ở trạng thái "${reg.status}", không thể duyệt`,
      );
    }
    const ownerIdStr = this.resolveId(reg.ownerId);

    // 2. Re-check balance tại thời điểm admin duyệt
    const ownerProfile = await this.horseOwnerProfileModel
      .findOne({ userId: new Types.ObjectId(ownerIdStr) })
      .lean();
    if (!ownerProfile || ownerProfile.balance < reg.entryFee) {
      // Auto reject nếu không đủ tiền bằng phương thức nghiệp vụ của repo
      await this.registrationRepository.updateStatusToRejected(
        id,
        'Số dư tài khoản không đủ tại thời điểm duyệt',
      );

      // await this.notificationRepository.create({
      //   userId: new Types.ObjectId(ownerIdStr),
      //   type: 'registration_auto_rejected',
      //   title: 'Đăng ký bị từ chối tự động',
      //   content: `Đăng ký của bạn bị từ chối do số dư không đủ. Phí đăng ký: ${reg.entryFee}`,
      //   isRead: false,
      // });
      throw new BadRequestException(
        'Số dư chủ ngựa không đủ, đăng ký đã bị từ chối tự động',
      );
    }

    // 3. Trừ entryFee (Giữ lại xử lý trực tiếp đối với thực thể chưa có repository riêng)
    await this.horseOwnerProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(ownerIdStr) },
      { $inc: { balance: -reg.entryFee } },
    );

    // 4. Insert Transaction qua TransactionRepository
    // await this.transactionRepository.create({
    //   senderId: new Types.ObjectId(ownerIdStr),
    //   receiverId: Platform,
    //   content: `Phí đăng ký giải đấu`,
    //   amount: reg.entryFee,
    //   type: TransactionTypeEnum.ENTRY_FEE,
    // });

    // 5. Cập nhật status + gán gateNumber thông qua hàm lưu trữ chuyên biệt
    const updated = await this.registrationRepository.updateStatusToConfirmed(
      id,
      dto.gateNumber,
    );

    // 6. Notification cho owner qua NotificationRepository
    // await this.notificationRepository.create({
    //   userId: new Types.ObjectId(ownerIdStr),
    //   type: 'registration_confirmed',
    //   title: 'Đăng ký được duyệt',
    //   content: `Đăng ký tham gia giải đấu đã được duyệt. Ô chuồng: ${dto.gateNumber}. Phí ${reg.entryFee} đã được trừ.`,
    //   isRead: false,
    // });

    return this.toResponse(updated);
  }

  async adminWaitlist(id: string): Promise<ResponseRegistrationDto> {
    const reg = await this.registrationRepository.findById(id);
    if (!reg) throw new NotFoundException('Không tìm thấy đăng ký');
    if (reg.status !== RegistrationStatusEnum.PENDING) {
      throw new ConflictException(
        `Đăng ký đang ở trạng thái "${reg.status}", không thể chuyển vào danh sách chờ`,
      );
    }

    // Gọi hàm đóng gói từ Repository
    const updated =
      await this.registrationRepository.updateStatusToWaitlisted(id);

    // const ownerIdStr = this.resolveId(reg.ownerId);
    // await this.notificationRepository.create({
    //   userId: new Types.ObjectId(ownerIdStr),
    //   type: 'registration_waitlisted',
    //   title: 'Đăng ký được chấp nhận vào danh sách',
    //   content: `Ngựa của bạn đã được chấp nhận vào pool tham gia giải đấu. Vui lòng chờ admin phân bổ race.`,
    //   isRead: false,
    // });

    return this.toResponse(updated);
  }

  // Admin reject
  async adminReject(
    id: string,
    dto: RejectRegistrationDto,
  ): Promise<ResponseRegistrationDto> {
    const reg = await this.registrationRepository.findById(id);
    if (!reg) throw new NotFoundException('Không tìm thấy đăng ký');
    if (reg.status !== RegistrationStatusEnum.PENDING) {
      throw new ConflictException(
        `Đăng ký đang ở trạng thái "${reg.status}", không thể từ chối`,
      );
    }

    // Gọi hàm đóng gói từ Repository
    const updated = await this.registrationRepository.updateStatusToRejected(
      id,
      dto.reason,
    );

    // const ownerIdStr = this.resolveId(reg.ownerId);
    // await this.notificationRepository.create({
    //   userId: new Types.ObjectId(ownerIdStr),
    //   type: 'registration_rejected',
    //   title: 'Đăng ký bị từ chối',
    //   content: `Đăng ký tham gia giải đấu bị từ chối. Lý do: ${dto.reason}`,
    //   isRead: false,
    // });

    return this.toResponse(updated);
  }
}
