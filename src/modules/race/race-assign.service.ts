import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import {
  HorseOwnerProfile,
  HorseOwnerProfileDocument,
} from '../user/schemas/horse-owner-profile.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { RaceRepository } from '../race/race.repository';
import { RegistrationRepository } from '../registration/registration.repository';
import { TransactionRepository } from '../payment/transaction.repository';
import { NotificationRepository } from '../notification/notification.repository';

import { RegistrationStatusEnum } from 'src/constants/registrationStatus.enum';
import { AssignRefereeDto, BulkAssignHorsesDto, BulkAssignResultDto } from './dto/race-assign.dto';
import { ResponseRaceDto } from '../race/dto';

import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
import { TransactionTypeEnum } from 'src/constants/transactionType.enum';
import { TransactionTitleEnum } from 'src/constants/transactionTitleEnum.enum';
import { RaceStatusEnum } from 'src/constants/raceStatus.enum';

@Injectable()
export class RaceAssignService {
  constructor(
    private readonly raceRepository: RaceRepository,
    private readonly registrationRepository: RegistrationRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly notificationRepository: NotificationRepository,
      @InjectModel(HorseOwnerProfile.name)
  private readonly horseOwnerProfileModel: Model<HorseOwnerProfileDocument>,
  ) {}

  private toRaceResponse(data: any): ResponseRaceDto {
    return plainToInstance(ResponseRaceDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async assignReferee(raceId: string, dto: AssignRefereeDto): Promise<ResponseRaceDto> {
    const race = await this.raceRepository.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    if (race.status !== RaceStatusEnum.SCHEDULED) {
      throw new BadRequestException(
        `Không thể gán referee khi race đang ở trạng thái "${race.status}". Chỉ được gán khi SCHEDULED.`,
      );
    }

    const conflicts = await this.raceRepository.findConflictingRacesForReferee(
      dto.refereeId,
      new Date(race.startTime),
      raceId,
    );
    if (conflicts.length > 0) {
      const names = conflicts.map((r: any) => r.name).join(', ');
      throw new ConflictException(
        `Referee đang được phân công race khác trong cùng thời điểm: ${names}`,
      );
    }

    const updated = await this.raceRepository.assignReferee(raceId, dto.refereeId);
    return this.toRaceResponse(updated);
  }

  //  Admin gán hàng loạt horse vào race 

async bulkAssignHorses(
  raceId: string,
  dto: BulkAssignHorsesDto,
): Promise<BulkAssignResultDto> {
  const race = await this.raceRepository.findById(raceId);
  if (!race) throw new NotFoundException('Không tìm thấy race');

  const tournament = race.tournamentId as any;
  const maxHorsesPerRace: number = tournament?.horsesPerRace ?? 10;
  const raceTournamentId = tournament?._id?.toString() || tournament?.toString();

  // Slot còn trống
  const currentCount = await this.registrationRepository.countConfirmedByRace(raceId);
  const available = maxHorsesPerRace - currentCount;

  if (available <= 0) {
    throw new BadRequestException(
      `Race đã đủ ${maxHorsesPerRace} ngựa, không thể gán thêm`,
    );
  }

  // Gate đã dùng
  const usedGates = await this.registrationRepository.getUsedGateNumbers(raceId);

  // Validate từng registrationId
  const skippedReasons: string[] = [];

  interface AssignItem {
    regId: string;
    entryFee: number;
    ownerId: string;
  }
  const toAssign: AssignItem[] = [];

  for (const regId of dto.registrationIds) {
    const reg = await this.registrationRepository.findById(regId);

    if (!reg) {
      skippedReasons.push(`${regId}: không tìm thấy`);
      continue;
    }
    if (reg.status !== RegistrationStatusEnum.WAITLISTED) {
      skippedReasons.push(`${regId}: status "${reg.status}", cần WAITLISTED`);
      continue;
    }

    const regTournamentId =
      (reg.tournamentId as any)?._id?.toString() || reg.tournamentId?.toString();
    if (regTournamentId !== raceTournamentId) {
      skippedReasons.push(`${regId}: không thuộc tournament của race này`);
      continue;
    }

    toAssign.push({
      regId,
      entryFee: reg.entryFee,
      ownerId: (reg.ownerId as any)?._id?.toString() || reg.ownerId?.toString(),
    });
  }

  // Giới hạn theo slot còn trống
  const assignable = toAssign.slice(0, available);
  if (toAssign.length > available) {
    skippedReasons.push(
      `${toAssign.length - available} con bị bỏ qua do race chỉ còn ${available} slot`,
    );
  }

  if (assignable.length === 0) {
    return {
      assigned: 0,
      skipped: dto.registrationIds.length,
      skippedReasons,
      gateAssignments: [],
    };
  }

  // Shuffle pool gate còn trống
  const availableGates = Array.from(
    { length: maxHorsesPerRace },
    (_, i) => i + 1,
  ).filter((g) => !usedGates.includes(g));

  if (availableGates.length < assignable.length) {
    throw new BadRequestException(
      `Không đủ ô chuồng trống. Còn ${availableGates.length} gate, cần ${assignable.length}`,
    );
  }

  // Fisher-Yates shuffle
  for (let i = availableGates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableGates[i], availableGates[j]] = [availableGates[j], availableGates[i]];
  }

  const gateAssignments: Array<{ registrationId: string; gateNumber: number }> = [];
  const bulkItems: Array<{ id: string; gateNumber: number; raceId: string }> = [];

  for (let index = 0; index < assignable.length; index++) {
    const { regId, entryFee, ownerId } = assignable[index];
    const gate = availableGates[index];

    // Atomic check + trừ tiền trong 1 operation
    const updatedProfile = await this.horseOwnerProfileModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(ownerId),
        balance: { $gte: entryFee },
      },
      { $inc: { balance: -entryFee } },
      { new: true },
    );

    if (!updatedProfile) {
      skippedReasons.push(`${regId}: số dư chủ ngựa không đủ (cần ${entryFee})`);

      await this.registrationRepository.updateStatusToRejected(
        regId,
        'Số dư tài khoản không đủ tại thời điểm duyệt',
      );
      await this.notificationRepository.create({
        userId: new Types.ObjectId(ownerId),
        type: NotificationTypeEnum.BALANCE_NOT_ENOUGH,
        title: NotificationTitleEnum.BALANCE_NOT_ENOUGH,
        content: `Đăng ký bị từ chối do số dư không đủ. Phí đăng ký: ${entryFee}`,
        isRead: false,
      });
      continue;
    }

    // Insert transaction
    await this.transactionRepository.create({
      senderId: new Types.ObjectId(ownerId),
      receiverId: null,
      content: TransactionTitleEnum.ENTRY_FEE,
      amount: entryFee,
      type: TransactionTypeEnum.ENTRY_FEE,
    });

    // Notification confirm
    await this.notificationRepository.create({
      userId: new Types.ObjectId(ownerId),
      type: NotificationTypeEnum.TOURNAMENT_REGISTERED,
      title: NotificationTitleEnum.TOURNAMENT_REGISTERED,
      content: `Đăng ký đã được duyệt. Ô chuồng: ${gate}. Phí ${entryFee} đã được trừ.`,
      isRead: false,
    });

    gateAssignments.push({ registrationId: regId, gateNumber: gate });
    bulkItems.push({ id: regId, gateNumber: gate, raceId });
  }

  if (bulkItems.length > 0) {
    await this.registrationRepository.bulkConfirmWithGate(bulkItems);
  }

  return {
    assigned: bulkItems.length,
    skipped: dto.registrationIds.length - bulkItems.length,
    skippedReasons,
    gateAssignments,
  };
}
}