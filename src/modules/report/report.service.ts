import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReportRepository } from './report.repository';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ResponseReportDto } from './dto/response-report.dto';
import { plainToInstance } from 'class-transformer';
import { ReportStatus } from 'src/constants/reportStatusEnum.enum';
import { Types } from 'mongoose';

@Injectable()
export class ReportService {
  constructor(private readonly reportRepository: ReportRepository) {}

  private toResponse(data: any): ResponseReportDto {
    return plainToInstance(ResponseReportDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async createReport(
    userId: string,
    dto: CreateReportDto,
  ): Promise<ResponseReportDto> {
    const reportData = {
      userId: new Types.ObjectId(userId),
      category: dto.category,
      description: dto.description,
      relatedRaceId: dto.relatedRaceId
        ? new Types.ObjectId(dto.relatedRaceId)
        : undefined,
      status: ReportStatus.PENDING,
    };

    const report = await this.reportRepository.createReport(reportData);
    return this.toResponse(report);
  }

  async getUserReports(userId: string): Promise<ResponseReportDto[]> {
    const reports = await this.reportRepository.findReportsByUserId(userId);
    return reports.map((report) => this.toResponse(report));
  }

  async getAllReports(filters: {
    status?: string;
    category?: string;
  }): Promise<ResponseReportDto[]> {
    const reports =
      await this.reportRepository.findAllReportsWithFilters(filters);
    return reports.map((report) => this.toResponse(report));
  }

  async getReportDetails(id: string): Promise<ResponseReportDto> {
    const report = await this.reportRepository.findReportById(id);
    if (!report)
      throw new NotFoundException('Không tìm thấy đơn tố cáo sự cố yêu cầu.');
    return this.toResponse(report);
  }

  async resolveReport(
    id: string,
    adminId: string,
    dto: ResolveReportDto,
  ): Promise<ResponseReportDto> {
    const report = await this.reportRepository.findReportById(id);
    if (!report)
      throw new NotFoundException('Không tìm thấy đơn tố cáo để xử lý.');

    if (
      report.status === ReportStatus.RESOLVED ||
      report.status === ReportStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Đơn tố cáo sự cố này đã kết thúc xử lý trước đó.',
      );
    }

    const updatedReport = await this.reportRepository.updateReportStatus(
      id,
      dto.status,
      dto.adminNotes || '',
      adminId,
    );

    // Lưu ý chuyên môn: Nếu tình huống là RESOLVED, tùy thuộc vào nghiệp vụ cụ thể
    // của các module ví tiền / đặt cược, bạn có thể gọi thêm các Service liên quan
    // như PointsTransactionService để hoàn trả tiền đóng băng hoặc cộng điểm cược thiếu tại đây.

    return this.toResponse(updatedReport);
  }

  async getReportStatistics(): Promise<Record<string, number>> {
    const stats = await this.reportRepository.getReportStats();

    return stats.reduce<Record<string, number>>((acc, curr) => {
      // curr._id bây giờ đã được hiểu là string, curr.count là number
      acc[curr._id] = curr.count;
      return acc;
    }, {});
  }

  async removeReport(id: string): Promise<{ message: string }> {
    const report = await this.reportRepository.findReportById(id);
    if (!report) throw new NotFoundException('Không tìm thấy bản ghi cần xóa.');

    await this.reportRepository.deleteReport(id);
    return { message: 'Xóa đơn tố cáo thành công.' };
  }
}
