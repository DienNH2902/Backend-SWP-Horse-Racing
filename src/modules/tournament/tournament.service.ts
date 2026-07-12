import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TournamentRepository } from './tournament.repository';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { UpdateTournamentStatusDto } from './dto/update-tournament-status.dto';
import { ResponseTournamentDto } from './dto/response-tournament.dto';
import { plainToInstance } from 'class-transformer';
// import { UserTournamentRepository } from './user-tournament.repository';
// import { Types } from 'mongoose';
import { GetTournamentsQueryDto } from './dto/get-tournament-status-query.dto';
import { RegistrationRepository } from '../registration/registration.repository';
import { TOURNAMENT_TOTAL_ROUNDS } from 'src/constants/tournamentStatusEnum.enum';
import { PrizeRepository } from '../prize-distribution/prize.repository';
import { RaceRepository } from '../race/race.repository';

export class ParticipantJockeyDto {
  jockeyId: string;
  fullName: string;
  avatar: string;
}

export class ParticipantHorseDto {
  horseId: string;
  name: string;
  weight?: number;
  height?: number;
  winRate: number;
  totalWin: number;
}

export class TournamentParticipantResponseDto {
  registrationId: string;
  gateNumber: number | null;
  raceId: string | null;
  jockey: ParticipantJockeyDto;
  horse: ParticipantHorseDto;
}

interface PopulatedRegistration {
  _id: any;
  gateNumber?: number;
  raceId?: any;
  jockeyId?: {
    _id: any;
    fullName?: string;
    avatar?: string;
    userId?: {
      fullName?: string;
      avatar?: string;
    };
  };
  horseId?: {
    _id: any;
    name: string;
    winRate?: number;
    totalWin?: number;
  };
}
@Injectable()
export class TournamentService {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly registrationRepository: RegistrationRepository,
    private readonly raceRepository: RaceRepository,
    private readonly prizeRepository: PrizeRepository,
    // private readonly userTournamentRepository: UserTournamentRepository,
  ) {}

  private toResponse(data: any): any {
    if (!data) return data;
    return plainToInstance(ResponseTournamentDto, data, {
      excludeExtraneousValues: true,
    });
  }

  private async calculateAvailableSlot(
    tournamentId: string,
    horsesPerRace: number,
    totalRaces: number,
  ): Promise<number> {
    // Gọi hàm đếm số lượng đơn đăng ký đang chiếm slot từ RegistrationRepository
    const registeredCount =
      await this.registrationRepository.countActiveRegistrationsByTournament(
        tournamentId,
      );

    // Tính tổng sức chứa hệ thống
    const maxCapacity = (horsesPerRace || 0) * (totalRaces || 0);

    // Trả về số lượng slot còn trống
    const availableSlot = maxCapacity - registeredCount;
    return availableSlot > 0 ? availableSlot : 0;
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  async createTournament(
    dto: CreateTournamentDto,
  ): Promise<ResponseTournamentDto> {
    // Chuẩn hóa khoảng thời gian về mốc ngày (bỏ giờ)
    const start = this.startOfDay(new Date(dto.startDate));
    const end = this.endOfDay(new Date(dto.endDate));

    if (start.getTime() >= end.getTime()) {
      throw new BadRequestException(
        'Ngày bắt đầu giải đấu phải trước ngày kết thúc',
      );
    }

    // Kiểm tra trùng lịch với các giải đấu khác
    const overlapping =
      await this.tournamentRepository.findOverlappingTournament(start, end);
    if (overlapping) {
      throw new BadRequestException(
        'Thời gian của giải đấu bị trùng lặp với một giải đấu khác đã tồn tại',
      );
    }

    const tournament = await this.tournamentRepository.createTournament({
      ...dto,
      totalRounds: TOURNAMENT_TOTAL_ROUNDS, // set cứng, không nhận từ client
      startDate: start,
      endDate: end,
    });

    return this.toResponse(tournament);
  }

  // async getAllTournament(): Promise<ResponseTournamentDto[]> {
  //   const tournaments = await this.tournamentRepository.findAllTournament();
  //   return this.toResponse(tournaments);
  // }

  // async getAllTournament(
  //   query: GetTournamentsQueryDto,
  // ): Promise<ResponseTournamentDto[]> {
  //   const tournaments = await this.tournamentRepository.findAllTournament({
  //     status: query.status,
  //   });
  //   return this.toResponse(tournaments);
  // }

  async getAllTournament(query: GetTournamentsQueryDto): Promise<any[]> {
    const tournaments = await this.tournamentRepository.findAllTournament({
      status: query.status,
    });

    // Duyệt qua từng giải đấu để tính toán động availableSlot
    const result = await Promise.all(
      tournaments.map(async (tournament) => {
        const plainTournament = tournament.toObject();
        const availableSlot = await this.calculateAvailableSlot(
          plainTournament._id.toString(),
          plainTournament.horsesPerRace,
          plainTournament.totalRaces,
        );

        return {
          ...this.toResponse(plainTournament),
          availableSlot,
        };
      }),
    );

    return result;
  }

  async getTournamentDashboardStatistics(): Promise<{
    totalTournaments: number;
    statuses: Record<string, number>;
  }> {
    const stats = await this.tournamentRepository.getTournamentStats();

    // Kết quả của $facet luôn nằm ở phần tử đầu tiên của mảng
    const tournamentAgg = stats[0];

    const statuses = tournamentAgg.byStatus.reduce<Record<string, number>>(
      (acc, curr) => {
        acc[String(curr._id)] = curr.count;
        return acc;
      },
      {},
    );

    return {
      totalTournaments: tournamentAgg.total[0]?.count || 0,
      statuses,
    };
  }

  // async getOneTournament(id: string): Promise<ResponseTournamentDto> {
  //   const tournament = await this.tournamentRepository.findTournamentById(id);
  //   if (!tournament) {
  //     throw new NotFoundException('Không tìm thấy giải đấu yêu cầu');
  //   }
  //   return this.toResponse(tournament);
  // }

  async getOneTournament(id: string): Promise<any> {
    const tournament = await this.tournamentRepository.findTournamentById(id);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu yêu cầu');
    }

    const plainTournament = tournament.toObject();
    const tournamentId = plainTournament._id.toString();

    const [availableSlot, prize] = await Promise.all([
      this.calculateAvailableSlot(
        tournamentId,
        plainTournament.horsesPerRace,
        plainTournament.totalRaces,
      ),
      this.prizeRepository.findByTournamentId(tournamentId),
    ]);

    return {
      ...this.toResponse(plainTournament),
      availableSlot,
      prize: prize
        ? {
            _id: prize._id.toString(),
            name: prize.name,
            amount: prize.amount,
          }
        : null,
    };
  }

  async getTournamentParticipants(
    tournamentId: string,
  ): Promise<TournamentParticipantResponseDto[]> {
    // 1. Kiểm tra giải đấu có tồn tại không
    const tournament =
      await this.tournamentRepository.findTournamentById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu yêu cầu');
    }

    // 2. Lấy danh sách các đơn đăng ký thành công
    const registrations =
      await this.registrationRepository.findConfirmedParticipantsByTournament(
        tournamentId,
      );

    // 3. Format dữ liệu trả về cho người xem (Spectators)
    // Đổi kiểu dữ liệu của reg sang PopulatedRegistration hoặc any để hết lỗi TS
    const participants = registrations.map((reg: PopulatedRegistration) => {
      return {
        registrationId: String(reg._id),
        gateNumber: reg.gateNumber || null,
        raceId: reg.raceId ? String(reg.raceId) : null,
        // Thông tin chi tiết về Nài ngựa
        jockey: {
          jockeyId: reg.jockeyId?._id ? String(reg.jockeyId._id) : '',
          fullName: reg.jockeyId?.fullName || 'N/A',
          avatar: reg.jockeyId?.avatar || '',
        },
        // Thông tin chi tiết về Ngựa đua
        horse: {
          horseId: reg.horseId?._id ? String(reg.horseId._id) : '',
          name: reg.horseId?.name || 'Unknown Horse',
          winRate: reg.horseId?.winRate || 0,
          totalWin: reg.horseId?.totalWin || 0,
        },
      };
    });

    return participants;
  }

  async updateTournament(
    id: string,
    dto: UpdateTournamentDto,
  ): Promise<ResponseTournamentDto> {
    const tournament = await this.tournamentRepository.findTournamentById(id);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu để cập nhật');
    }

    const updateData: any = { ...dto };

    // Xác định mốc thời gian sau khi update (nếu không truyền thì giữ nguyên cũ)
    const start = dto.startDate
      ? this.startOfDay(new Date(dto.startDate))
      : this.startOfDay(tournament.startDate);

    const end = dto.endDate
      ? this.endOfDay(new Date(dto.endDate))
      : this.endOfDay(tournament.endDate);

    if (start >= end) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
    }

    // Nếu có thay đổi về thời gian, kiểm tra trùng lặp lịch (loại trừ chính giải đấu này)
    if (dto.startDate || dto.endDate) {
      const overlapping =
        await this.tournamentRepository.findOverlappingTournament(
          start,
          end,
          id,
        );
      if (overlapping) {
        throw new BadRequestException(
          'Thời gian cập nhật bị trùng lặp với một giải đấu khác đã tồn tại',
        );
      }
      updateData.startDate = start;
      updateData.endDate = end;
    }

    const updated = await this.tournamentRepository.updateTournament(
      id,
      updateData,
    );
    return this.toResponse(updated);
  }

  async updateStatus(
    id: string,
    dto: UpdateTournamentStatusDto,
  ): Promise<ResponseTournamentDto> {
    const tournament = await this.tournamentRepository.findTournamentById(id);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu yêu cầu');
    }

    const updated = await this.tournamentRepository.updateTournament(id, {
      status: dto.status,
    });
    return this.toResponse(updated);
  }

  async removeTournament(id: string): Promise<{ message: string }> {
    const tournament = await this.tournamentRepository.findTournamentById(id);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu để xóa');
    }

    const hasRace = await this.raceRepository.findByTournament(id);
    if (hasRace && hasRace.length > 0)
      throw new BadRequestException(
        `Vui lòng xóa các race liên quan trước khi xóa giải`,
      );

    await this.tournamentRepository.deleteTournament(id);
    return { message: 'Xóa giải đấu thành công' };
  }
}
