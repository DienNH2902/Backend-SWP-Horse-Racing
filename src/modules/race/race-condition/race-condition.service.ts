import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RaceConditionRepository } from './race-condition.repository';
import { RaceRepository } from '../race.repository';
import {
  CreateRaceConditionDto,
  UpdateRaceConditionDto,
  ResponseRaceConditionDto,
} from './dto';

@Injectable()
export class RaceConditionService {
  constructor(
    private readonly raceConditionRepository: RaceConditionRepository,
    private readonly raceRepository: RaceRepository,
  ) {}

  private toResponse(data: any): ResponseRaceConditionDto {
    return plainToInstance(ResponseRaceConditionDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async create(
    dto: CreateRaceConditionDto,
    refereeId: string,
  ): Promise<ResponseRaceConditionDto> {
    const race = await this.raceRepository.findById(dto.raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    const dbRefereeId = race.refereeId?._id
      ? race.refereeId._id
      : race.refereeId;

    if (!dbRefereeId || String(dbRefereeId) !== String(refereeId)) {
      throw new ForbiddenException(
        'Bạn không phải referee được gán cho race này',
      );
    }

    const existing = await this.raceConditionRepository.findByRaceId(
      dto.raceId,
    );
    if (existing) {
      throw new ConflictException('Race này đã có thông tin điều kiện');
    }

    const condition = await this.raceConditionRepository.create(dto);
    return this.toResponse(condition.toObject());
  }

  async update(
    raceId: string,
    dto: UpdateRaceConditionDto,
  ): Promise<ResponseRaceConditionDto> {
    const updated = await this.raceConditionRepository.updateByRaceId(
      raceId,
      dto,
    );

    if (!updated) {
      throw new NotFoundException('Không tìm thấy điều kiện của race này');
    }

    return this.toResponse(updated);
  }

  async findByRaceId(raceId: string): Promise<ResponseRaceConditionDto> {
    const condition = await this.raceConditionRepository.findByRaceId(raceId);

    if (!condition) {
      throw new NotFoundException('Race này chưa có thông tin điều kiện');
    }

    return this.toResponse(condition);
  }
}
