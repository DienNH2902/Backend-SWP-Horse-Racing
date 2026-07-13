import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger 
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
import { UsersRepository } from '../user/user.repository';
import { SystemWalletRepository } from '../payment/system-wallet.repository';

import { RegistrationStatusEnum } from 'src/constants/registrationStatus.enum';
import {
  AssignRefereeDto,
  BulkAssignHorsesDto,
  BulkAssignResultDto,
} from './dto/race-assign.dto';
import { ResponseRaceDto } from '../race/dto';

import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
import { TransactionTypeEnum } from 'src/constants/transactionType.enum';
import { TransactionTitleEnum } from 'src/constants/transactionTitleEnum.enum';
import { RaceStatusEnum } from 'src/constants/raceStatus.enum';

@Injectable()
export class RaceAssignService {
  private readonly logger = new Logger(RaceAssignService.name);

  constructor(
    private readonly raceRepository: RaceRepository,
    private readonly registrationRepository: RegistrationRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly usersRepository: UsersRepository, 
    private readonly systemWalletRepository: SystemWalletRepository,    
    @InjectModel(HorseOwnerProfile.name)
    private readonly horseOwnerProfileModel: Model<HorseOwnerProfileDocument>,
  ) {}

  private toRaceResponse(data: any): ResponseRaceDto {
    return plainToInstance(ResponseRaceDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async assignReferee(
    raceId: string,
    dto: AssignRefereeDto,
  ): Promise<ResponseRaceDto> {
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

    const updated = await this.raceRepository.assignReferee(
      raceId,
      dto.refereeId,
    );
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
    const raceTournamentId =
      tournament?._id?.toString() || tournament?.toString();

    // Slot còn trống
    const currentCount =
      await this.registrationRepository.countConfirmedByRace(raceId);
    const available = maxHorsesPerRace - currentCount;

    if (available <= 0) {
      throw new BadRequestException(
        `Race đã đủ ${maxHorsesPerRace} ngựa, không thể gán thêm`,
      );
    }

    // Gate đã dùng
    const usedGates =
      await this.registrationRepository.getUsedGateNumbers(raceId);

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
        (reg.tournamentId as any)?._id?.toString() ||
        reg.tournamentId?.toString();
      if (regTournamentId !== raceTournamentId) {
        skippedReasons.push(`${regId}: không thuộc tournament của race này`);
        continue;
      }

      toAssign.push({
        regId,
        entryFee: reg.entryFee,
        ownerId:
          (reg.ownerId as any)?._id?.toString() || reg.ownerId?.toString(),
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
      [availableGates[i], availableGates[j]] = [
        availableGates[j],
        availableGates[i],
      ];
    }

    const gateAssignments: Array<{
      registrationId: string;
      gateNumber: number;
    }> = [];
    const bulkItems: Array<{ id: string; gateNumber: number; raceId: string }> =
      [];

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
        { returnDocument: 'after' },
      );

      if (!updatedProfile) {
        skippedReasons.push(
          `${regId}: số dư chủ ngựa không đủ (cần ${entryFee})`,
        );

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

// Thêm vào RaceAssignService (hoặc RaceService tùy cấu trúc của bạn)
// Cần inject thêm: UsersRepository, TransactionRepository, SystemWalletRepository

  async removeHorseFromRace(
    raceId: string,
    horseId: string,
  ): Promise<{ message: string }> {
    // 1. Validate race tồn tại và chưa confirm-ready
    const race = await this.raceRepository.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    const allowedStatuses = [RaceStatusEnum.SCHEDULED];
    if (!allowedStatuses.includes(race.status as RaceStatusEnum)) {
      throw new BadRequestException(
        `Chỉ có thể xóa ngựa khi race ở trạng thái Scheduled. ` +
        `Hiện tại: ${race.status}`,
      );
    }

    // 2. Tìm registration CONFIRMED của horse trong race này
    const registration =
      await this.registrationRepository.findConfirmedByRaceAndHorse(
        raceId,
        horseId,
      );
    if (!registration) {
      throw new NotFoundException(
        'Không tìm thấy đăng ký đã xác nhận của ngựa này trong race',
      );
    }

    const entryFee = registration.entryFee ?? 0;
    const ownerId = registration.ownerId?.toString();

    // 3. Update registration → Rejected + clear raceId, gateNumber
    await this.registrationRepository.updateStatusToRemoved(
      registration._id.toString(),
    );
    this.logger.log(
      `Registration ${registration._id} → Rejected (removed from race)`,
    );

    // 4. Hoàn tiền nếu entryFee > 0
    if (entryFee > 0 && ownerId) {
      // 4a. Tìm HorseOwnerProfile để lấy profileId
      const ownerProfile =
        await this.usersRepository.findHorseOwnerProfileByUserId(ownerId);
      if (!ownerProfile) {
        this.logger.warn(
          `Không tìm thấy HorseOwnerProfile cho ownerId ${ownerId} — bỏ qua refund`,
        );
      } else {
        // 4b. Cộng lại balance cho owner
        await this.usersRepository.incrementHorseOwnerBalance(
          ownerProfile._id.toString(),
          entryFee,
        );
        this.logger.log(
          `Hoàn tiền ${entryFee} cho HorseOwner ${ownerProfile._id}`,
        );

        // 4c. Trừ ví hệ thống
        await this.systemWalletRepository.decreaseBalance(entryFee);
        this.logger.log(`SystemWallet -${entryFee} (refund)`);

        // 4d. Insert Transaction (system → owner)
        await this.transactionRepository.create({
          senderId: null, // system
          receiverId: new Types.ObjectId(ownerId),
          amount: entryFee,
          type: TransactionTypeEnum.REFUND,
          content: `${TransactionTitleEnum.REFUND} - Ngựa bị loại khỏi race`,
        });
        this.logger.log(`Transaction REFUND inserted cho owner ${ownerId}`);
      }
    }

    return { message: 'Đã xóa ngựa khỏi race và hoàn tiền thành công' };
  }  
}
