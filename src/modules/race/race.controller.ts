import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RaceService } from './race.service';
import { RaceAssignService } from './race-assign.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import {
  CreateRaceBatchDto,
  ResponseRaceDto,
  AssignRaceCourseDto,
} from './dto';
import { RaceStatusEnum } from 'src/constants/raceStatus.enum';
import {
  AssignRefereeDto,
  BulkAssignHorsesDto,
  BulkAssignResultDto,
} from './dto/race-assign.dto';

@ApiTags('Races')
@Controller('races')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RaceController {
  constructor(
    private readonly service: RaceService,
    private readonly assignService: RaceAssignService,
  ) {}

  @Post('batch')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary: 'ADMIN tạo nhiều RACE vòng 1 cùng lúc cho một TOURNAMENT',
  })
  createBatch(@Body() dto: CreateRaceBatchDto): Promise<ResponseRaceDto[]> {
    return this.service.createRacesBatch(dto);
  }

  @Post(':tournamentId/round2')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Tạo RACE vòng 2',
  })
  @ApiParam({ name: 'tournamentId', description: 'Tournament ID' })
  @ApiQuery({ name: 'startTime', example: '2026-07-20T08:00:00.000Z' })
  @ApiQuery({ name: 'date', example: '2026-07-20' })
  createRound2(
    @Param('tournamentId') tournamentId: string,
    @Query('startTime') startTime: string,
    @Query('date') date: string,
  ): Promise<ResponseRaceDto> {
    return this.service.createFinalRace(tournamentId, startTime, date);
  }

  @Patch(':raceId/assign-referee')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'ADMIN gán REFEREE vào RACE' })
  @ApiParam({ name: 'raceId', description: 'Race ID' })
  assignReferee(
    @Param('raceId') raceId: string,
    @Body() dto: AssignRefereeDto,
  ): Promise<ResponseRaceDto> {
    return this.assignService.assignReferee(raceId, dto);
  }

  @Post(':raceId/bulk-assign-horses')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'ADMIN sắp xếp ngựa WAITLISTED vào RACE' })
  @ApiParam({ name: 'raceId', description: 'Race ID' })
  bulkAssignHorses(
    @Param('raceId') raceId: string,
    @Body() dto: BulkAssignHorsesDto,
  ): Promise<BulkAssignResultDto> {
    return this.assignService.bulkAssignHorses(raceId, dto);
  }

  @Get('my-races')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.REFEREE)
  @ApiOperation({
    summary: 'REFEREE xem danh sách RACE được assigned cho mình',
  })
  getMyRaces(@Request() req: any): Promise<ResponseRaceDto[]> {
    return this.service.getRacesByReferee(req.user._id as string);
  }

  @Get('admin/dashboard/stats')
  async getRaceDashboardStatistics(): Promise<{
    totalRaces: number;
    statuses: Record<string, number>;
  }> {
    return await this.service.getRaceDashboardStatistics();
  }

  @Get('tournament/:tournamentId')
  @ApiOperation({
    summary: 'Xem toàn bộ RACE của một TOURNAMENT, lọc theo status',
  })
  @ApiParam({ name: 'tournamentId' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RaceStatusEnum,
    description:
      'Lọc theo status: Scheduled | Ready | Simulated | Ongoing | Finished | Cancelled',
  })
  getByTournament(
    @Param('tournamentId') tournamentId: string,
    @Query('status') status?: RaceStatusEnum,
  ): Promise<ResponseRaceDto[]> {
    return this.service.getRacesByTournament(tournamentId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một race' })
  @ApiParam({ name: 'id', description: 'Race ID' })
  getOne(@Param('id') id: string): Promise<ResponseRaceDto> {
    return this.service.getRaceById(id);
  }

  @Patch(':raceId/assign-race-course')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'ADMIN gán đường đua vào RACE' })
  @ApiParam({ name: 'raceId', description: 'Race ID' })
  assignRaceCourse(
    @Param('raceId') raceId: string,
    @Body() dto: AssignRaceCourseDto,
  ): Promise<ResponseRaceDto> {
    return this.service.assignRaceCourse(raceId, dto.raceCourseId);
  }

  @Patch(':raceId/confirm-ready')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.REFEREE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'REFEREE xác nhận race để bắt đầu → status = "Ready"',
  })
  async confirmReady(@Param('raceId') id: string, @Request() req: any) {
    const refereeId = req.user._id as string;
    return await this.service.confirmReady(id, refereeId);
  }

  // @Delete(':raceId/remove-horse-from-race/:horseId')
  // @UseGuards(RolesGuard)
  // @Roles(RoleEnum.ADMIN)
  // @ApiOperation({
  //   summary: 'ADMIN xóa ngựa khỏi RACE trước khi confirm-ready, tự động hoàn tiền entryFee',
  // })
  // @ApiParam({ name: 'raceId', description: 'Race ID' })
  // @ApiParam({ name: 'horseId', description: 'Horse ID cần xóa' })
  // removeHorseFromRace(
  //   @Param('raceId') raceId: string,
  //   @Param('horseId') horseId: string,
  // ): Promise<{ message: string }> {
  //   // return this.assignService.removeHorseFromRace(raceId, horseId);
  // }
}
