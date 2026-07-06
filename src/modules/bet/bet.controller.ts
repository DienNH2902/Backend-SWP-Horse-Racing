// src/bet/bet.controller.ts
import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BetService } from './bet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBetDto } from './dto/create-bet.dto';
import { UpdateBetDto } from './dto/update-bet.dto';
import { ResponseBetDto } from './dto/response-bet.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Bets (Cá cược Hệ Thống)')
@Controller('bets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BetController {
  constructor(private readonly betService: BetService) {}

  @Post()
  @ApiOperation({
    summary: 'Đặt cược mới cho vòng đua (Chỉ khi trạng thái race là Scheduled)',
  })
  async createBet(
    @Request() req: any,
    @Body() dto: CreateBetDto,
  ): Promise<ResponseBetDto> {
    return this.betService.createBet(req.user._id as string, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary: 'ADMIN lấy toàn bộ các bet đặt cược của hệ thống',
  })
  async getBet(): Promise<ResponseBetDto> {
    return this.betService.findAllBets();
  }

  @Get('/my-bet')
  @ApiOperation({
    summary: 'Lấy toàn bộ các bet đặt cược của tài khoản hiện tại',
  })
  async getAllMyBets(@Request() req: any): Promise<ResponseBetDto> {
    const userId = req.user._id as string;
    return this.betService.findAllMyBets(userId);
  }

  @Get('admin/dashboard/stats')
  async getBetDashboardStatistics(): Promise<{
    totalBets: number;
    statuses: Record<string, number>;
  }> {
    return await this.betService.getBetDashboardStatistics();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy bet bằng id',
  })
  async getBetById(@Param('id') id: string): Promise<ResponseBetDto> {
    return this.betService.findBetById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Chỉnh sửa thay đổi đơn cược (Hoàn trả điểm cũ, tính toán trừ điểm mới)',
  })
  async updateBet(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBetDto,
  ): Promise<ResponseBetDto> {
    return this.betService.updateBet(req.user._id as string, id, dto);
  }
}
