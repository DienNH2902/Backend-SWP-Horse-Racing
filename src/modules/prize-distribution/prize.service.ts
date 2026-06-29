import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';

import { PrizeRepository } from './prize.repository';
import { CreatePrizeDto } from './dto/create-prize.dto';
import { PrizeResponseDto } from './dto/prize-response.dto';
import { TournamentRepository } from '../tournament/tournament.repository';
import { TournamentStatusEnum } from 'src/constants/tournamentStatusEnum.enum';

@Injectable()
export class PrizeService {
  constructor(
    private readonly prizeRepo: PrizeRepository,
    private readonly tournamentRepo: TournamentRepository,
  ) {}

  private toResponse(data: any): PrizeResponseDto {
    return plainToInstance(PrizeResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async createPrize(dto: CreatePrizeDto): Promise<PrizeResponseDto> {
    // Validate tournament tồn tại
    const tournament = await this.tournamentRepo.findById(dto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy tournament');
    }

    // Chỉ cho tạo prize khi tournament đang ở trạng thái PREPARING
    if (
      tournament.status !== TournamentStatusEnum.PREPARING &&
      tournament.status !== TournamentStatusEnum.REGISTRATION
    ) {
      throw new BadRequestException(
        'Tournament phải ở trạng thái "PREPARING" hoặc "REGISTRATION" để tạo prize',
      );
    }

    // Chống duplicate: mỗi tournament chỉ có 1 prize
    const existed = await this.prizeRepo.findByTournamentId(dto.tournamentId);
    if (existed) {
      throw new ConflictException('Prize đã tồn tại cho tournament này');
    }

    const prize = await this.prizeRepo.create({
      tournamentId: new Types.ObjectId(dto.tournamentId),
      name: dto.name,
      amount: dto.amount,
    });

    return this.toResponse(prize);
  }

  async getPrizeByTournamentId(tournamentId: string): Promise<PrizeResponseDto> {
    const prize = await this.prizeRepo.findByTournamentId(tournamentId);
    if (!prize) {
      throw new NotFoundException('Chưa có prize cho tournament này');
    }
    return this.toResponse(prize);
  }
}