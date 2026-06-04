import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RaceCourseRepository } from './race-course.repository';
import {
  CreateRaceCourseDto,
  UpdateRaceCourseDto,
  ResponseRaceCourseDto,
} from './dto';

@Injectable()
export class RaceCourseService {
  constructor(
    private readonly raceCourseRepository: RaceCourseRepository,
  ) {}

  private toResponse(data: any): ResponseRaceCourseDto {
    return plainToInstance(ResponseRaceCourseDto, data, {
      excludeExtraneousValues: true,
    });
  }

  // Admin tạo mới đường đua
  async create(dto: CreateRaceCourseDto): Promise<ResponseRaceCourseDto> {
    const course = await this.raceCourseRepository.create(dto);
    return this.toResponse(course.toObject());
  }

  // Xem tất cả — referee/admin chọn từ danh sách này khi chuẩn bị race
  async findAll(): Promise<ResponseRaceCourseDto[]> {
    const list = await this.raceCourseRepository.findAll();
    return list.map((c) => this.toResponse(c));
  }

  async findById(id: string): Promise<ResponseRaceCourseDto> {
    const course = await this.raceCourseRepository.findById(id);
    if (!course) {
      throw new NotFoundException('Không tìm thấy đường đua');
    }
    return this.toResponse(course);
  }

  async update(
    id: string,
    dto: UpdateRaceCourseDto,
  ): Promise<ResponseRaceCourseDto> {
    const updated = await this.raceCourseRepository.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Không tìm thấy đường đua');
    }
    return this.toResponse(updated);
  }
}