import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';

@ApiTags('Schedule')
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('upcoming')
  @ApiOperation({
    summary: 'Lấy lịch các RACE sắp tới của hệ thống',
  })
  getUpcomingPublicSchedule() {
    return this.scheduleService.getUpcomingPublicSchedule();
  }

  @Get('upcoming/owner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.HORSE_OWNER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'OWNER lấy lịch RACE sắp tới của ngựa mình sở hữu',
    description: 'Trả về danh sách race sắp diễn ra có ngựa thuộc sở hữu của owner hiện tại tham gia.',
  })
  getUpcomingOwnerSchedule(@Req() req: any) {
    return this.scheduleService.getUpcomingOwnerSchedule(req.user._id as string);
  }

  @Get('upcoming/referee')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.REFEREE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'REFEREE lấy lịch RACE sắp tới của mình',
    description: 'Trả về danh sách race sắp diễn ra mà referee hiện tại được phân công.',
  })
  getUpcomingRefereeSchedule(@Req() req: any) {
    return this.scheduleService.getUpcomingRefereeSchedule(req.user._id as string);
  }

  @Get('upcoming/jockey')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.JOCKEY)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'JOCKEY lấy lịch RACE sắp tới của mình',
    description: 'Trả về danh sách race sắp diễn ra mà jockey hiện tại tham gia.',
  })                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
  getUpcomingJockeySchedule(@Req() req: any) {
    return this.scheduleService.getUpcomingJockeySchedule(req.user._id as string);
  }


}