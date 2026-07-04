import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';

export interface IReportStatusStat {
  _id: string; // Đây là chuỗi trạng thái như PENDING, RESOLVED...
  count: number;
}

@Injectable()
export class ReportRepository {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
  ) {}

  async createReport(reportData: Partial<Report>): Promise<ReportDocument> {
    const newReport = new this.reportModel({
      ...reportData,
      userId: new Types.ObjectId(reportData.userId),
      relatedRaceId: reportData.relatedRaceId
        ? new Types.ObjectId(reportData.relatedRaceId)
        : undefined,
    });
    return await newReport.save();
  }

  async findOneReport(
    filter: QueryFilter<Report>,
  ): Promise<ReportDocument | null> {
    return await this.reportModel
      .findOne(filter)
      .populate('userId', 'fullName email')
      .exec();
  }

  async findReportById(id: string): Promise<ReportDocument | null> {
    return await this.reportModel
      .findById(new Types.ObjectId(id))
      .populate('userId', 'fullName email')
      .exec();
  }

  async findReportsByUserId(userId: string): Promise<ReportDocument[]> {
    return await this.reportModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllReportsWithFilters(query: {
    status?: string;
    category?: string;
  }): Promise<ReportDocument[]> {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;

    return await this.reportModel
      .find(filter)
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateReportStatus(
    id: string,
    status: string,
    adminNotes: string,
    adminId: string,
  ): Promise<ReportDocument | null> {
    return await this.reportModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        {
          $set: {
            status: status,
            adminNotes: adminNotes,
            resolvedBy: new Types.ObjectId(adminId),
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  // Thống kê số lượng report theo trạng thái bằng Aggregate Framework của MongoDB
  async getReportStats(): Promise<IReportStatusStat[]> {
    return await this.reportModel
      .aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
  }

  async deleteReport(id: string): Promise<ReportDocument | null> {
    return await this.reportModel
      .findByIdAndDelete(new Types.ObjectId(id))
      .exec();
  }
}
