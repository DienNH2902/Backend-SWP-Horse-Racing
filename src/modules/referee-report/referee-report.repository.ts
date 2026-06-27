import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RefereeReport } from './schemas/referee-report.schema';
import { RefereeReportType } from '../../constants/refereeReportType.enum';

export interface CreateRefereeReportData {
  raceId: Types.ObjectId;
  refereeId: Types.ObjectId;
  type: RefereeReportType;
  rawResultId?: Types.ObjectId[];
  reason?: string | null;
}

@Injectable()
export class RefereeReportRepository {
  constructor(
    @InjectModel(RefereeReport.name)
    private readonly reportModel: Model<RefereeReport>,
  ) {}

  async create(data: CreateRefereeReportData): Promise<RefereeReport> {
    return await this.reportModel.create({
      raceId: data.raceId,
      refereeId: data.refereeId,
      type: data.type,
      rawResultId: data.rawResultId ?? [],
      reason: data.reason ?? null,
    });
  }

  async findByRaceId(raceId: string): Promise<RefereeReport[]> {
    return await this.reportModel
      .find({ raceId: new Types.ObjectId(raceId) })
      .sort({ createAt: 1 })
      .lean()
      .exec();
  }

  async findByRaceIdAndType(
    raceId: string,
    type: RefereeReportType,
  ): Promise<RefereeReport | null> {
    return await this.reportModel
      .findOne({
        raceId: new Types.ObjectId(raceId),
        type,
      })
      .lean()
      .exec();
  }

  async existsByRaceIdAndType(
    raceId: string,
    type: RefereeReportType,
  ): Promise<boolean> {
    const count = await this.reportModel.countDocuments({
      raceId: new Types.ObjectId(raceId),
      type,
    });
    return count > 0;
  }
}