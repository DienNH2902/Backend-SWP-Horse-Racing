import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ResponseReportDto } from './dto/response-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReportStatus } from 'src/constants/reportStatusEnum.enum';
import { ReportCategory } from 'src/constants/reportCategoryEnum.enum';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('System Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @ApiOperation({
    summary:
      'Người dùng gửi báo cáo/tố cáo về lỗi hệ thống (Không nhận điểm thắng, lỗi tiền đóng băng...)',
  })
  @ApiResponse({ status: 201, type: ResponseReportDto })
  async create(
    @Request() req: any,
    @Body() dto: CreateReportDto,
  ): Promise<ResponseReportDto> {
    const userId = req.user._id as string;
    return await this.reportService.createReport(userId, dto);
  }

  @Get('my-reports')
  @ApiOperation({
    summary: 'Cá nhân người dùng xem danh sách lịch sử tố cáo của chính mình',
  })
  @ApiResponse({ status: 200, type: [ResponseReportDto] })
  async getMyReports(@Request() req: any): Promise<ResponseReportDto[]> {
    const userId = req.user._id as string;
    return await this.reportService.getUserReports(userId);
  }

  @Get('admin/all')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Admin lọc toàn bộ danh sách tố cáo lỗi hệ thống' })
  @ApiQuery({
    name: 'status',
    enum: ReportStatus,
    required: false,
    description: 'Lọc danh sách theo trạng thái xử lý đơn tố cáo',
  })
  @ApiQuery({
    name: 'category',
    enum: ReportCategory,
    required: false,
    description: 'Lọc danh sách theo phân loại sự cố hệ thống',
  })
  @ApiResponse({ status: 200, type: [ResponseReportDto] })
  async findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
  ): Promise<ResponseReportDto[]> {
    return await this.reportService.getAllReports({ status, category });
  }

  @Get('admin/stats')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Admin xem số liệu tổng hợp các ca báo cáo sự cố' })
  async getStats() {
    return await this.reportService.getReportStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một đơn tố cáo bằng ID' })
  @ApiResponse({ status: 200, type: ResponseReportDto })
  async findOne(@Param('id') id: string): Promise<ResponseReportDto> {
    return await this.reportService.getReportDetails(id);
  }

  @Put(':id/resolve')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Admin phê duyệt xử lý, bác bỏ đơn tố cáo và ghi chú giải trình',
  })
  @ApiResponse({ status: 200, type: ResponseReportDto })
  async resolve(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: ResolveReportDto,
  ): Promise<ResponseReportDto> {
    const adminId = req.user._id as string;
    return await this.reportService.resolveReport(id, adminId, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa một đơn thư tố cáo (Hệ thống dọn dẹp dữ liệu)',
  })
  async remove(@Param('id') id: string) {
    return await this.reportService.removeReport(id);
  }
}
