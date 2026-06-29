// src/prize-distribution/prize.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { PrizeService } from './prize.service';
import { CreatePrizeDto } from './dto/create-prize.dto';
import { PrizeResponseDto } from './dto/prize-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';

@ApiTags('Prize')
@Controller('prizes')
export class PrizeController {
  constructor(private readonly prizeService: PrizeService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ADMIN tạo prize cho giải đấu (chỉ khi tournament ở trạng thái PREPARING/ REGISTRATION)',
  })
  async createPrize(@Body() dto: CreatePrizeDto): Promise<PrizeResponseDto> {
    return await this.prizeService.createPrize(dto);
  }

  @Get('tournament/:tournamentId')
  @ApiOperation({ summary: 'Lấy prize theo tournamentId' })
  @ApiParam({
    name: 'tournamentId',
    type: String,
    description: 'ID của giải đấu cần xem prize',
    example: '6a291c8a3636b7316d90c34f',
  })
  async getPrizeByTournamentId(
    @Param('tournamentId') tournamentId: string,
  ): Promise<PrizeResponseDto> {
    return await this.prizeService.getPrizeByTournamentId(tournamentId);
  }
}