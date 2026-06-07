import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RefereeReportService } from './referee-report.service';
import { CreateEndReportDto, RefereeReportResponseDto } from './dto/index';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';

@ApiTags('Referee Reports')
@Controller('referee-reports')
export class RefereeReportController {
  constructor(private readonly reportService: RefereeReportService) {}

  // ── POST /referee-reports/:raceId/end 
  @Post(':raceId/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.REFEREE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'REFEREE tạo end report sau khi race kết thúc',
    description:
      'Tạo report loại "end". rawResultId và reason là optional — chỉ điền nếu có vi phạm.',
  })
  async createEndReport(
    @Param('raceId') raceId: string,
    @Request() req: any,
    @Body() dto: CreateEndReportDto,
  ): Promise<RefereeReportResponseDto> {
    const refereeId = req.user._id as string;
    return await this.reportService.createEndReport(raceId, refereeId, dto);
  }

  // ── GET /referee-reports/:raceId 
  @Get(':raceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.REFEREE, RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy tất cả report của một race (start + end)',
  })
  async getReportsByRace(
    @Param('raceId') raceId: string,
  ): Promise<RefereeReportResponseDto[]> {
    return await this.reportService.getReportsByRace(raceId);
  }

  // ── GET /referee-reports/:raceId/start 
  @Get(':raceId/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.REFEREE, RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy start report của race',
  })
  async getStartReport(
    @Param('raceId') raceId: string,
  ): Promise<RefereeReportResponseDto> {
    return await this.reportService.getStartReport(raceId);
  }
}