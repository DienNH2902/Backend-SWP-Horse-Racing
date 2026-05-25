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

@Injectable()
export class TournamentService {
  constructor(private readonly tournamentRepository: TournamentRepository) {}

  private toResponse(data: any): any {
    if (!data) return data;
    return plainToInstance(ResponseTournamentDto, data, {
      excludeExtraneousValues: true,
    });
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

  async getAllTournament(): Promise<ResponseTournamentDto[]> {
    const tournaments = await this.tournamentRepository.findAllTournament();
    return this.toResponse(tournaments);
  }

  async getOneTournament(id: string): Promise<ResponseTournamentDto> {
    const tournament = await this.tournamentRepository.findTournamentById(id);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu yêu cầu');
    }
    return this.toResponse(tournament);
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
