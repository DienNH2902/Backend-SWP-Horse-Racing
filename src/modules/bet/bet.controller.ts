// src/bet/bet.controller.ts
import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BetService } from './bet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBetDto } from './dto/create-bet.dto';
import { UpdateBetDto } from './dto/update-bet.dto';
import { ResponseBetDto } from './dto/response-bet.dto';

@ApiTags('Bets (Cá cược Hệ Thống)')
@Controller('bets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BetController {
  constructor(private readonly betService: BetService) {}

  @Post()
  @ApiOperation({
    summary: 'Đặt cược mới cho vòng đua (Chỉ khi trạng thái là Scheduled)',
  })
  async createBet(
    @Request() req: any,
    @Body() dto: CreateBetDto,
  ): Promise<ResponseBetDto> {
    return this.betService.createBet(req.user._id as string, dto);
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
