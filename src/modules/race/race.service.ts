import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RaceRepository } from './race.repository';
import { TournamentRepository } from '../tournament/tournament.repository'; 
import { RaceStatusEnum } from '../../constants/raceStatus.enum';
import { CreateRaceBatchDto, ResponseRaceDto } from './dto';

@Injectable()
export class RaceService {
  constructor(
    private readonly raceRepository: RaceRepository,
    private readonly tournamentRepository: TournamentRepository,
  ) {}

  private toResponse(data: any): ResponseRaceDto {
    return plainToInstance(ResponseRaceDto, data, {
      excludeExtraneousValues: true,
    });
  }

  // Admin: Batch tạo race vòng 1 
  async createRaceBatch(dto: CreateRaceBatchDto): Promise<ResponseRaceDto[]> {
    // 1. Validate tournament tồn tại thông qua Repository
    const tournament = await this.tournamentRepository.findById(dto.tournamentId);
    if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu');

    // 2. Validate từng date phải nằm trong startDate–endDate tournament
    for (const item of dto.races) {
      const raceDate = new Date(item.date);
      if (raceDate < tournament.startDate || raceDate > tournament.endDate) {
        throw new BadRequestException(
          `Race "${item.name}": ngày ${item.date} phải nằm trong ` +
            `${tournament.startDate.toISOString().split('T')[0]} → ` +
            `${tournament.endDate.toISOString().split('T')[0]}`,
        );
      }
    }

    // 3. Check không vượt quá totalRaces của tournament
    const existingCount = await this.raceRepository.countByTournament(dto.tournamentId);
    if (existingCount + dto.races.length > tournament.totalRaces) {
      throw new ConflictException(
        `Tournament chỉ cho phép tối đa ${tournament.totalRaces} races. ` +
          `Hiện tại đã có ${existingCount}, đang thêm ${dto.races.length}.`,
      );
    }

    // 4 & 5. Repository tự động xử lý việc lấy maxOrder, tạo ObjectId và insert
    const created = await this.raceRepository.createBatch(dto.tournamentId, dto.races);
    return created.map((r) => this.toResponse(r));
  }

  // Xem race theo tournament 

  async getRacesByTournament(tournamentId: string): Promise<ResponseRaceDto[]> {
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu');

    const races = await this.raceRepository.findByTournament(tournamentId);
    return races.map((r) => this.toResponse(r));
  }

  async getRaceById(id: string): Promise<ResponseRaceDto> {
    const race = await this.raceRepository.findById(id);
    if (!race) throw new NotFoundException('Không tìm thấy race');
    return this.toResponse(race);
  }

  // Hệ thống tự động tạo race vòng 2 sau khi vòng 1 kết thúc 

  async autoCreateRound2(
    tournamentId: string,
    startTime: string,
    date: string,
  ): Promise<ResponseRaceDto> {
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu');

    // Kiểm tra tất cả race vòng 1 đã FINISHED chưa
    const round1Races = await this.raceRepository.findByTournamentAndRound(tournamentId, 1);
    if (round1Races.length === 0) {
      throw new BadRequestException('Chưa có race vòng 1 nào');
    }
    
    const allFinished = round1Races.every((r) => r.status === RaceStatusEnum.FINISHED);
    if (!allFinished) {
      throw new ConflictException('Tất cả race vòng 1 phải kết thúc trước khi tạo chung kết');
    }

    // Kiểm tra chưa có race vòng 2
    const existingRound2 = await this.raceRepository.countByTournamentAndRound(tournamentId, 2);
    if (existingRound2 > 0) {
      throw new ConflictException('Race chung kết đã được tạo');
    }

    // Repository tự động xử lý việc tạo tên, tính maxOrder, chuyển đổi ObjectId và lưu
    const final = await this.raceRepository.createRound2Race(
      tournamentId,
      tournament.title,
      new Date(startTime),
      new Date(date),
    );

    return this.toResponse(final);
  }
}