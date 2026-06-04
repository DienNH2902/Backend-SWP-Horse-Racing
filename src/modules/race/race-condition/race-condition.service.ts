import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RaceConditionRepository } from './race-condition.repository';
import {
  CreateRaceConditionDto,
  UpdateRaceConditionDto,
  ResponseRaceConditionDto,
} from './dto';

@Injectable()
export class RaceConditionService {
  constructor(
    private readonly raceConditionRepository: RaceConditionRepository,
  ) {}

  private toResponse(data: any): ResponseRaceConditionDto {
    return plainToInstance(ResponseRaceConditionDto, data, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Referee điền thông tin điều kiện trước khi race bắt đầu
   * Mỗi race chỉ có 1 condition (unique raceId)
   */
  async create(dto: CreateRaceConditionDto): Promise<ResponseRaceConditionDto> {
    // Kiểm tra qua Repository, không gọi trực tiếp Model
    const existing = await this.raceConditionRepository.findByRaceId(dto.raceId);
    if (existing) {
      throw new ConflictException(
        'Race này đã có thông tin điều kiện, dùng API cập nhật thay vì tạo mới',
      );
    }

    // Giao việc tạo mới cho Repository
    const condition = await this.raceConditionRepository.create(dto);
    return this.toResponse(condition.toObject());
  }

  /**
   * Referee cập nhật nếu điều kiện thay đổi trước khi race bắt đầu
   */
  async update(
    raceId: string,
    dto: UpdateRaceConditionDto,
  ): Promise<ResponseRaceConditionDto> {
    // Giao việc cập nhật cho Repository (đã xử lý sẵn ObjectId và $set)
    const updated = await this.raceConditionRepository.updateByRaceId(raceId, dto);
    
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