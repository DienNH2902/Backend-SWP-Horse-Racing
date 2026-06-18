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

  async createTournament(
    dto: CreateTournamentDto,
  ): Promise<ResponseTournamentDto> {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    //Không cần validate ở đây vì đã validate ở createDto
    // if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    //   throw new BadRequestException('Định dạng ngày tháng không hợp lệ');
    // }

    if (start >= end) {
      throw new BadRequestException(
        'Ngày bắt đầu giải đấu phải trước ngày kết thúc',
      );
    }

    const tournament = await this.tournamentRepository.createTournament({
      ...dto,
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
    const availableSlot = await this.calculateAvailableSlot(
      plainTournament._id.toString(),
      plainTournament.horsesPerRace,
      plainTournament.totalRaces,
    );

    return {
      ...this.toResponse(plainTournament),
      availableSlot,
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

    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    if (
      updateData.startDate &&
      updateData.endDate &&
      updateData.startDate >= updateData.endDate
    ) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
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
    await this.tournamentRepository.deleteTournament(id);
    return { message: 'Xóa giải đấu thành công' };
  }
}
