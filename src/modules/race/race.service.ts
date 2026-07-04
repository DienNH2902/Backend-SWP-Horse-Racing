import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RaceRepository } from './race.repository';
import { TournamentRepository } from '../tournament/tournament.repository';
import { RegistrationRepository } from '../registration/registration.repository';
import { RaceCourseRepository } from './race-course/race-course.repository';
import { RaceStatusEnum } from '../../constants/raceStatus.enum';
import { CreateRaceBatchDto, ResponseRaceDto } from './dto';
import { RefereeReportService } from '../referee-report/referee-report.service';

@Injectable()
export class RaceService {
  constructor(
    private readonly raceRepository: RaceRepository,
    private readonly tournamentRepository: TournamentRepository,
    @Inject(forwardRef(() => RefereeReportService))
    private readonly refereeReportService: RefereeReportService,
    private readonly registrationRepository: RegistrationRepository,
    private readonly raceCourseRepository: RaceCourseRepository,
  ) {}

  private toResponse(data: any): ResponseRaceDto {
    return plainToInstance(ResponseRaceDto, data, {
      excludeExtraneousValues: true,
    });
  }

  private resolveId(field: any): string {
    return field?._id?.toString() || field?.toString();
  }

  private async toResponseDto(raceDoc: any): Promise<ResponseRaceDto> {
    if (!raceDoc) {
      throw new NotFoundException('Không tìm thấy trận đấu yêu cầu');
    }

    const raceObj = raceDoc.toObject ? raceDoc.toObject() : raceDoc;

    // Tìm toàn bộ danh sách đăng ký đã được Confirm và gán vào Race này
    const registrations =
      await this.registrationRepository.findConfirmedWithDetails(
        raceObj._id.toString(),
      );

    // Chuẩn hóa cấu trúc dữ liệu từ registration đổ vào mảng ảo participants cho DTO biến đổi
    raceObj.participants = registrations.map((reg: any) => ({
      horseId: reg.horseId as string,
      // horseName: reg.horse?.name || 'Ngựa đua',
      jockeyId: reg.jockeyId as string,
      // jockeyName:
      //   reg.jockeyName ||
      //   reg.jockeyId?.jockeyName ||
      //   'Nài ngựa',
      gateNumber: reg.gateNumber as number,
    }));

    const tournament = await this.tournamentRepository.findById(
      this.resolveId(raceObj.tournamentId),
    );

    if (!tournament) {
      throw new NotFoundException(
        'Không tìm thấy thông tin giải đấu được chỉ định để map DTO',
      );
    }
    const maxCapacity = tournament.horsesPerRace || 10;

    // Tính toán động số slot
    const totalSlots = maxCapacity;
    const filledSlots = registrations.length;

    raceObj.totalSlots = totalSlots as number;
    raceObj.filledSlots = filledSlots;
    raceObj.availableSlots = totalSlots - filledSlots;

    return plainToInstance(ResponseRaceDto, raceObj, {
      excludeExtraneousValues: true,
    });
  }

  async getOneRace(id: string): Promise<ResponseRaceDto> {
    const race = await this.raceRepository.findOneRace({ _id: id });
    if (!race) throw new NotFoundException('Không tìm thấy trận đấu');
    return this.toResponseDto(race);
  }

  async getRaceById(id: string): Promise<ResponseRaceDto> {
    const race = await this.raceRepository.findOneRace({ _id: id });
    if (!race) throw new NotFoundException('Không tìm thấy race');
    return this.toResponseDto(race);
  }

  // Admin: Batch tạo race vòng 1
  async createRacesBatch(dto: CreateRaceBatchDto): Promise<ResponseRaceDto[]> {
    const tournament = await this.tournamentRepository.findById(
      dto.tournamentId,
    );
    if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu');

    // Không tạo vòng 1 sau khi vòng 2 đã tồn tại
    const round2Exists = await this.raceRepository.findByTournamentAndRound(
      dto.tournamentId,
      2,
    );
    if (round2Exists.length > 0) {
      throw new ConflictException(
        'Giải đấu đã có race chung kết, không thể tạo thêm race vòng 1',
      );
    }

    // Đếm riêng race vòng 1 để validate đúng totalRaces
    const round1Count = await this.raceRepository.countByTournamentAndRound(
      dto.tournamentId,
      1,
    );
    if (round1Count + dto.races.length > tournament.totalRaces) {
      throw new BadRequestException(
        `Tournament chỉ cho phép ${tournament.totalRaces} races vòng 1. ` +
          `Hiện có: ${round1Count}`,
      );
    }

    // Validate tất cả date nằm trong startDate–endDate tournament
    for (const item of dto.races) {
      const raceDate = new Date(item.date);
      if (
        raceDate < new Date(tournament.startDate) ||
        raceDate > new Date(tournament.endDate)
      ) {
        throw new BadRequestException(
          `Race "${item.name}": ngày ${item.date} phải nằm trong ` +
            `${tournament.startDate} → ${tournament.endDate}`,
        );
      }
    }

    // Repository tự lo raceOrder + ObjectId conversion
    const created = await this.raceRepository.createBatch(
      dto.tournamentId,
      dto.races,
    );
    return created.map((r) => this.toResponse(r));
  }

  // Hệ thống tự động tạo race vòng 2 sau khi vòng 1 kết thúc
  async createFinalRace(
    tournamentId: string,
    startTime: string,
    date: string,
  ): Promise<ResponseRaceDto> {
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu');

    // Tránh tạo trùng vòng 2
    const existing = await this.raceRepository.findByTournamentAndRound(
      tournamentId,
      2,
    );
    if (existing.length > 0) {
      throw new ConflictException('Race chung kết đã tồn tại');
    }

    // Validate date nằm trong tournament
    const raceDate = new Date(date);
    if (
      raceDate < new Date(tournament.startDate) ||
      raceDate > new Date(tournament.endDate)
    ) {
      throw new BadRequestException(
        `Ngày ${date} phải nằm trong thời gian Tournament: ${tournament.startDate} → ${tournament.endDate}`,
      );
    }

    // Validate date phải sau race cuối cùng của round 1
    const round1Races = await this.raceRepository.findByTournamentAndRound(
      tournamentId,
      1,
    );
    if (round1Races.length > 0) {
      const lastRound1Date = round1Races.reduce((latest, r) => {
        const d = new Date(r.date);
        return d > latest ? d : latest;
      }, new Date(0));

      if (raceDate <= lastRound1Date) {
        throw new BadRequestException(
          `Ngày race chung kết phải sau ngày race vòng 1 cuối cùng (${lastRound1Date.toISOString().split('T')[0]})`,
        );
      }
    }

    const finalRace = await this.raceRepository.createRound2Race(
      tournamentId,
      tournament.title,
      new Date(startTime),
      new Date(date),
    );

    return this.toResponse(finalRace);
  }

  async getRacesByTournament(
    tournamentId: string,
    status?: RaceStatusEnum,
  ): Promise<ResponseRaceDto[]> {
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu');

    const races = await this.raceRepository.findByTournamentAndStatus(
      tournamentId,
      status,
    );
    return Promise.all(races.map((r) => this.toResponseDto(r)));
  }

  // async getRaceById(id: string): Promise<ResponseRaceDto> {
  //   const race = await this.raceRepository.findById(id);
  //   if (!race) throw new NotFoundException('Không tìm thấy race');

  //   const horses = await this.registrationRepository.findHorsesByRaceId(id);
  //   console.log(horses);

  //   const filledSlots = horses.length;
  //   const totalSlots = (race as any).tournamentId?.horsesPerRace ?? null;

  //   return this.toResponse({ ...race, horses, filledSlots, totalSlots });
  // }

  async getRacesByReferee(refereeId: string): Promise<ResponseRaceDto[]> {
    const races = await this.raceRepository.findByReferee(refereeId);
    return Promise.all(races.map((r) => this.toResponseDto(r)));
  }

  async confirmReady(raceId: string, refereeId: string) {
    const race = await this.raceRepository.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    if (!race.refereeId) {
      throw new BadRequestException('Race chưa được gán Referee');
    }

    const assignedRefereeId = (race.refereeId as any)._id.toString();

    if (assignedRefereeId !== refereeId) {
      throw new ForbiddenException(
        'Bạn không phải Referee được gán cho race này',
      );
    }

    if (race.status !== RaceStatusEnum.SCHEDULED) {
      throw new BadRequestException(
        `Race phải ở trạng thái "Scheduled" để confirm ready`,
      );
    }

    await this.raceRepository.updateStatus(raceId, RaceStatusEnum.READY);
    await this.refereeReportService.createStartReport(raceId, refereeId);

    return { message: 'Race đã sẵn sàng. Report đã được tạo.' };
  }

  async assignRaceCourse(
    raceId: string,
    raceCourseId: string,
  ): Promise<ResponseRaceDto> {
    // Verify race tồn tại
    const race = await this.raceRepository.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    // Verify raceCourse tồn tại
    const course = await this.raceCourseRepository.findById(raceCourseId);
    if (!course) throw new NotFoundException('Không tìm thấy đường đua');

    const updated = await this.raceRepository.assignRaceCourse(
      raceId,
      raceCourseId,
    );
    return this.toResponse(updated);
  }
}
