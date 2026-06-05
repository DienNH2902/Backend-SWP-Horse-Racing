import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RaceRepository } from '../race/race.repository';
import { RegistrationRepository } from '../registration/registration.repository';
import { RegistrationStatusEnum } from 'src/constants/registrationStatus.enum';
import { AssignRefereeDto, BulkAssignHorsesDto, BulkAssignResultDto } from './dto/race-assign.dto';
import { ResponseRaceDto } from '../race/dto';

@Injectable()
export class RaceAssignService {
  constructor(
    private readonly raceRepository: RaceRepository,
    private readonly registrationRepository: RegistrationRepository,
  ) {}

  private toRaceResponse(data: any): ResponseRaceDto {
    return plainToInstance(ResponseRaceDto, data, {
      excludeExtraneousValues: true,
    });
  }

  //  Admin assign referee vào race 

  async assignReferee(raceId: string, dto: AssignRefereeDto): Promise<ResponseRaceDto> {
    const race = await this.raceRepository.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

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

  // ─── Admin gán hàng loạt horse vào race ──────────────────────────────────

  async bulkAssignHorses(
    raceId: string,
    dto: BulkAssignHorsesDto,
  ): Promise<BulkAssignResultDto> {
    const race = await this.raceRepository.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    // horsesPerRace lấy từ tournament đã populate trong race
    const tournament = race.tournamentId as any;
    const maxHorsesPerRace: number = tournament?.horsesPerRace ?? 10;

    // Slot còn trống trong race
    const currentCount = await this.registrationRepository.countConfirmedByRace(raceId);
    const available = maxHorsesPerRace - currentCount;

    if (available <= 0) {
      throw new BadRequestException(
        `Race đã đủ ${maxHorsesPerRace} ngựa, không thể gán thêm`,
      );
    }

    // Gate còn trống
    const usedGates = await this.registrationRepository.getUsedGateNumbers(raceId);

    // Validate từng registrationId
    const skippedReasons: string[] = [];
    const toAssign: string[] = [];
    const raceTournamentId =
      tournament?._id?.toString() || tournament?.toString();

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

      toAssign.push(regId);
    }

    // Giới hạn theo slot còn trống
    const assignable = toAssign.slice(0, available);
    if (toAssign.length > available) {
      skippedReasons.push(
        `${toAssign.length - available} con bị bỏ qua do race chỉ còn ${available} slot`,
      );
    }

    if (assignable.length === 0) {
      return { assigned: 0, skipped: dto.registrationIds.length, skippedReasons, gateAssignments: [] };
    }

    // Shuffle pool gate còn trống
    const availableGates = Array.from(
      { length: maxHorsesPerRace },
      (_, i) => i + 1,
    ).filter((g) => !usedGates.includes(g));

    // Guard: đảm bảo đủ gate cho số con cần gán
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

    assignable.forEach((regId, index) => {
      const gate = availableGates[index];
      gateAssignments.push({ registrationId: regId, gateNumber: gate });
      bulkItems.push({ id: regId, gateNumber: gate, raceId });
    });

    // Bulk write một lần duy nhất
    await this.registrationRepository.bulkConfirmWithGate(bulkItems);

    return {
      assigned: assignable.length,
      skipped: dto.registrationIds.length - assignable.length,
      skippedReasons,
      gateAssignments,
    };
  }
}