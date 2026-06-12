import {
  forwardRef,
  Inject ,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RaceRepository } from './race.repository';
import { TournamentRepository } from '../tournament/tournament.repository'; 
import { RegistrationRepository } from '../registration/registration.repository';
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

  ) {}

  private toResponse(data: any): ResponseRaceDto {
    return plainToInstance(ResponseRaceDto, data, {
      excludeExtraneousValues: true,
    });
  }

  // Admin: Batch tạo race vòng 1 
  async createRacesBatch(dto: CreateRaceBatchDto): Promise<ResponseRaceDto[]> {
    const tournament = await this.tournamentRepository.findById(dto.tournamentId);
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
    const created = await this.raceRepository.createBatch(dto.tournamentId, dto.races);
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
 
    // Tất cả race vòng 1 phải FINISHED
    const allDone = await this.raceRepository.allRound1Finished(tournamentId);
    if (!allDone) {
      throw new ConflictException(
        'Chưa thể tạo race chung kết — vẫn còn race vòng 1 chưa kết thúc',
      );
    }
 
    // Tránh tạo trùng vòng 2
    const existing = await this.raceRepository.findByTournamentAndRound(tournamentId, 2);
    if (existing.length > 0) {
      throw new ConflictException('Race chung kết đã tồn tại');
    }
 
    // Repository tự lo raceOrder + build data
    const finalRace = await this.raceRepository.createRound2Race(
      tournamentId,
      tournament.title,
      new Date(startTime),
      new Date(date),
    );
 
    return this.toResponse(finalRace);
  }


  async getRacesByTournament(tournamentId: string): Promise<ResponseRaceDto[]> {
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu');

    const races = await this.raceRepository.findByTournament(tournamentId);
    return races.map((r) => this.toResponse(r));
  }

  async getRaceById(id: string): Promise<ResponseRaceDto> {
    const race = await this.raceRepository.findById(id);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    const horses = await this.registrationRepository.findHorsesByRaceId(id);

    const filledSlots = horses.length;
    const totalSlots = (race as any).tournamentId?.horsesPerRace  ?? null;

    return this.toResponse({ ...race, horses, filledSlots, totalSlots });
  }


  async getRacesByReferee(refereeId: string): Promise<ResponseRaceDto[]> {
    const races = await this.raceRepository.findByReferee(refereeId);
    return races.map((r) => this.toResponse(r));
  }

  async confirmReady(raceId: string, refereeId: string) {
    const race = await this.raceRepository.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    if (race.status !== RaceStatusEnum.SCHEDULED) {
      throw new BadRequestException(
        `Race phải ở trạng thái "Scheduled" để confirm ready`,
      );
    }

    await this.raceRepository.updateStatus(raceId, RaceStatusEnum.READY);
    await this.refereeReportService.createStartReport(raceId, refereeId);

    return { message: 'Race đã sẵn sàng. Start report đã được tạo.' };
  }
}