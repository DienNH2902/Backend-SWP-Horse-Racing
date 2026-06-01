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
import { RegistrationStatusEnum } from 'src/constants/registrationStatus.enum';
import { TransactionTypeEnum } from 'src/constants/transactionType.enum';
import {
  CreateRegistrationDto,
  ConfirmRegistrationDto,
  RejectRegistrationDto,
  ResponseRegistrationDto,
} from './dto';

import {
  JockeyInvitation,
  JockeyInvitationDocument,
  InvitationStatusEnum,
} from '../invitation/schemas/invitation.schema';
import {
  Contract,
  ContractDocument,
  ContractStatusEnum,
} from '../invitation/schemas/contract.schema';
import {
  HorseOwnerProfile,
  HorseOwnerProfileDocument,
} from '../user/schemas/horse-owner-profile.schema';
import {
  Tournament,
  TournamentDocument,
} from '../tournament/schemas/tournament.schema';
import {
  Transaction,
  TransactionDocument,
} from '../transaction/schemas/transaction.schema';
import {
  Notification,
  NotificationDocument,
} from '../notification/schemas/notification.schema';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly registrationRepository: RegistrationRepository,

    @InjectModel(JockeyInvitation.name)
    private readonly invitationModel: Model<JockeyInvitationDocument>,

    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,

    @InjectModel(HorseOwnerProfile.name)
    private readonly ownerProfileModel: Model<HorseOwnerProfileDocument>,

    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,

    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,

    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private toResponse(data: any): ResponseRegistrationDto {
    return plainToInstance(ResponseRegistrationDto, data, {
      excludeExtraneousValues: true,
    });
  }

  private resolveId(field: any): string {
    return field?._id?.toString() || field?.toString();
  }

  // ─── Feature 1: HorseOwner tạo Registration ────────────────────────────────

  async createRegistration(
    dto: CreateRegistrationDto,
    requesterId: string,
  ): Promise<ResponseRegistrationDto> {
    // 1. Verify invitation tồn tại và status = ACCEPTED
    const invitation = await this.invitationModel
      .findById(dto.jockeyInvitationId)
      .lean();
    if (!invitation) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }
    if (invitation.status !== InvitationStatusEnum.ACCEPTED) {
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

    // 2. Verify contract tương ứng status = ACTIVE
    const contract = await this.contractModel
      .findOne({
        jockeyInvitationId: new Types.ObjectId(dto.jockeyInvitationId),
        status: ContractStatusEnum.ACTIVE,
      })
      .lean();
    if (!contract) {
      throw new BadRequestException(
        'Không tìm thấy hợp đồng active cho lời mời này',
      );
    }

    // 3. Lấy entryFee từ Tournament
    const tournamentIdStr = this.resolveId(invitation.tournamentId);
    const tournament = await this.tournamentModel
      .findById(tournamentIdStr)
      .lean();
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu');
    }
    const entryFee = tournament.entryFee;

    // 4. Check balance >= entryFee
    const ownerProfile = await this.ownerProfileModel
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

    // 6. Insert Registration — gateNumber chưa có, admin sẽ assign khi confirm
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

  // ─── Feature 1: HorseOwner xem registration của mình ──────────────────────

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

  // ─── Feature 2: Admin xem danh sách ───────────────────────────────────────

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

  // ─── Feature 2: Admin confirm — assign gateNumber, trừ tiền ───────────────

  async adminConfirm(
    id: string,
    dto: ConfirmRegistrationDto,
  ): Promise<ResponseRegistrationDto> {
    // 1. Check registration status = pending
    const reg = await this.registrationRepository.findById(id);
    if (!reg) throw new NotFoundException('Không tìm thấy đăng ký');
    if (reg.status !== RegistrationStatusEnum.PENDING) {
      throw new ConflictException(
        `Đăng ký đang ở trạng thái "${reg.status}", không thể duyệt`,
      );
    }

    const ownerIdStr = this.resolveId(reg.ownerId);

    // 2. Re-check balance tại thời điểm admin duyệt
    const ownerProfile = await this.ownerProfileModel
      .findOne({ userId: new Types.ObjectId(ownerIdStr) })
      .lean();

    if (!ownerProfile || ownerProfile.balance < reg.entryFee) {
      // Auto reject nếu không đủ tiền
      await this.registrationRepository.updateById(id, {
        $set: {
          status: RegistrationStatusEnum.REJECTED,
          rejectedReason: 'Số dư tài khoản không đủ tại thời điểm duyệt',
          rejectedAt: new Date(),
        },
      });

      await this.notificationModel.create({
        userId: new Types.ObjectId(ownerIdStr),
        type: 'registration_auto_rejected',
        title: 'Đăng ký bị từ chối tự động',
        content: `Đăng ký của bạn bị từ chối do số dư không đủ. Phí đăng ký: ${reg.entryFee}`,
        isRead: false,
      });

      throw new BadRequestException(
        'Số dư chủ ngựa không đủ, đăng ký đã bị từ chối tự động',
      );
    }

    // 3. Trừ entryFee
    await this.ownerProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(ownerIdStr) },
      { $inc: { balance: -reg.entryFee } },
    );

    // 4. Insert Transaction
    await this.transactionModel.create({
      senderId: new Types.ObjectId(ownerIdStr),
      receiverId: null,
      content: `Phí đăng ký giải đấu`,
      amount: reg.entryFee,
      type: TransactionTypeEnum.ENTRY_FEE,
    });

    // 5. Cập nhật status + gán gateNumber do admin chỉ định
    const updated = await this.registrationRepository.updateById(id, {
      $set: {
        status: RegistrationStatusEnum.CONFIRMED,
        gateNumber: dto.gateNumber,
        confirmedAt: new Date(),
      },
    });

    // 6. Notification cho owner
    await this.notificationModel.create({
      userId: new Types.ObjectId(ownerIdStr),
      type: 'registration_confirmed',
      title: 'Đăng ký được duyệt',
      content: `Đăng ký tham gia giải đấu đã được duyệt. Ô chuồng: ${dto.gateNumber}. Phí ${reg.entryFee} đã được trừ.`,
      isRead: false,
    });

    return this.toResponse(updated);
  }

  // ─── Feature 2: Admin reject ──────────────────────────────────────────────

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

    const updated = await this.registrationRepository.updateById(id, {
      $set: {
        status: RegistrationStatusEnum.REJECTED,
        rejectedReason: dto.reason,
        rejectedAt: new Date(),
      },
    });

    const ownerIdStr = this.resolveId(reg.ownerId);

    await this.notificationModel.create({
      userId: new Types.ObjectId(ownerIdStr),
      type: 'registration_rejected',
      title: 'Đăng ký bị từ chối',
      content: `Đăng ký tham gia giải đấu bị từ chối. Lý do: ${dto.reason}`,
      isRead: false,
    });

    return this.toResponse(updated);
  }

  // ─── Feature 3: Danh sách horse confirmed trong race ──────────────────────

  async getConfirmedByRace(raceId: string): Promise<ResponseRegistrationDto[]> {
    const list = await this.registrationRepository.findConfirmedByRace(raceId);
    return list.map((r) => this.toResponse(r));
  }
}