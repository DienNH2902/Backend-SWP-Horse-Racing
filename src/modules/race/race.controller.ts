import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RaceService } from './race.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { CreateRaceBatchDto, ResponseRaceDto } from './dto';

@ApiTags('Races')
@Controller('races')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RaceController {
  constructor(private readonly service: RaceService) {}

  /**
   * Admin batch tạo nhiều race vòng 1 cùng lúc
   */
  @Post('batch')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Admin tạo nhiều race vòng 1 cùng lúc cho một tournament',
  })
  createBatch(@Body() dto: CreateRaceBatchDto): Promise<ResponseRaceDto[]> {
    return this.service.createRaceBatch(dto);
  }

  /**
   * Hệ thống tự động tạo race chung kết (vòng 2)
   * sau khi tất cả race vòng 1 FINISHED
   */
  @Post(':tournamentId/round2')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary:
      'Tạo race chung kết (vòng 2) — chỉ khả dụng khi toàn bộ vòng 1 đã kết thúc',
  })
  @ApiParam({ name: 'tournamentId', description: 'Tournament ID' })
  @ApiQuery({ name: 'startTime', example: '2026-07-20T08:00:00.000Z' })
  @ApiQuery({ name: 'date', example: '2026-07-20' })
  createRound2(
    @Param('tournamentId') tournamentId: string,
    @Query('startTime') startTime: string,
    @Query('date') date: string,
  ): Promise<ResponseRaceDto> {
    return this.service.autoCreateRound2(tournamentId, startTime, date);
  }

  /**
   * Xem tất cả race của một tournament (sắp xếp theo raceOrder)
   */
  @Get('tournament/:tournamentId')
  @ApiOperation({ summary: 'Xem toàn bộ race của một tournament' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament ID' })
  getByTournament(
    @Param('tournamentId') tournamentId: string,
  ): Promise<ResponseRaceDto[]> {
    return this.service.getRacesByTournament(tournamentId);
  }

  /**
   * Xem chi tiết 1 race
   */
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một race' })
  @ApiParam({ name: 'id', description: 'Race ID' })
  getOne(@Param('id') id: string): Promise<ResponseRaceDto> {
    return this.service.getRaceById(id);
  }
}