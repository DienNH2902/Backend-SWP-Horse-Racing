import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';

import { RefereeReportRepository } from './referee-report.repository';
import { RefereeReportType } from '../../constants/refereeReportType.enum';
import {
  CreateEndReportDto,
  RefereeReportResponseDto,
} from './dto/index';

// External repos
import { RaceRepository } from '../race/race.repository';
import { RaceStatusEnum } from 'src/constants/raceStatus.enum';

@Injectable()
export class RefereeReportService {
  constructor(
    private readonly reportRepo: RefereeReportRepository,
    private readonly raceRepo: RaceRepository,
  ) {}

  private toResponse(data: any): RefereeReportResponseDto {
    return plainToInstance(RefereeReportResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }

  // ── Tạo START report — gọi nội bộ khi Referee confirm ready ────────────────
  // Được gọi từ RaceService.confirmReady(), không expose endpoint riêng
  async createStartReport(
    raceId: string,
    refereeId: string,
  ): Promise<RefereeReportResponseDto> {
    // Chỉ tạo 1 lần — tránh duplicate
    const existed = await this.reportRepo.existsByRaceIdAndType(
      raceId,
      RefereeReportType.START,
    );
    if (existed) {
      throw new ConflictException('Start report đã tồn tại cho race này');
    }

    const report = await this.reportRepo.create({
      raceId: new Types.ObjectId(raceId),
      refereeId: new Types.ObjectId(refereeId),
      type: RefereeReportType.START,
      rawResultId: null,
      reason: null,
    });

    return this.toResponse(report);
  }

  // ── Tạo END report — Referee gọi sau khi race kết thúc ────────────────────
  async createEndReport(
    raceId: string,
    refereeId: string,
    dto: CreateEndReportDto,
  ): Promise<RefereeReportResponseDto> {
    // Validate race tồn tại và đã simulated/finished
    const race = await this.raceRepo.findById(raceId);
    if (!race) throw new NotFoundException('Không tìm thấy race');

    const allowedStatuses = [RaceStatusEnum.SIMULATED, RaceStatusEnum.FINISHED];
    if (!allowedStatuses.includes(race.status as RaceStatusEnum)) {
      throw new BadRequestException(
        'Race phải ở trạng thái "simulated" hoặc "finished" để tạo end report',
      );
    }

    // Chống duplicate end report
    const existed = await this.reportRepo.existsByRaceIdAndType(
      raceId,
      RefereeReportType.END,
    );
    if (existed) {
      throw new ConflictException('End report đã tồn tại cho race này');
    }

    const report = await this.reportRepo.create({
      raceId: new Types.ObjectId(raceId),
      refereeId: new Types.ObjectId(refereeId),
      type: RefereeReportType.END,
      rawResultId: dto.rawResultId
        ? new Types.ObjectId(dto.rawResultId)
        : null,
      reason: dto.reason ?? null,
    });

    return this.toResponse(report);
  }

  // ── Lấy tất cả report của một race ────────────────────────────────────────
  async getReportsByRace(raceId: string): Promise<RefereeReportResponseDto[]> {
    const reports = await this.reportRepo.findByRaceId(raceId);
    return reports.map((r) => this.toResponse(r));
  }

  // ── Lấy start report của race ──────────────────────────────────────────────
  async getStartReport(raceId: string): Promise<RefereeReportResponseDto> {
    const report = await this.reportRepo.findByRaceIdAndType(
      raceId,
      RefereeReportType.START,
    );
    if (!report) throw new NotFoundException('Chưa có start report cho race này');
    return this.toResponse(report);
  }
}