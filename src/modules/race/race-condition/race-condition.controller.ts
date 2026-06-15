import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RaceConditionService } from './race-condition.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import {
  CreateRaceConditionDto,
  UpdateRaceConditionDto,
  ResponseRaceConditionDto,
} from './dto';

@ApiTags('Race Conditions')
@Controller('race-conditions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RaceConditionController {
  constructor(private readonly service: RaceConditionService) {}

  @Post()
  @Roles(RoleEnum.REFEREE)
  @ApiOperation({ summary: 'Referee tạo điều kiện race' })
  create(
    @Body() dto: CreateRaceConditionDto,
    @Request() req: any,
  ) {
    const refereeId = req.user.sub as string;
    return this.service.create(dto, refereeId);  
  }

  @Patch(':raceId')
  @Roles(RoleEnum.REFEREE)
  @ApiOperation({ summary: 'Referee cập nhật điều kiện race (nếu thời tiết thay đổi)' })
  @ApiParam({ name: 'raceId', description: 'Race ID' })
  update(
    @Param('raceId') raceId: string,
    @Body() dto: UpdateRaceConditionDto,
  ): Promise<ResponseRaceConditionDto> {
    return this.service.update(raceId, dto);
  }


  @Get(':raceId')
  @Roles(RoleEnum.REFEREE, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Xem thông tin điều kiện của một race' })
  @ApiParam({ name: 'raceId', description: 'Race ID' })
  findOne(
    @Param('raceId') raceId: string,
  ): Promise<ResponseRaceConditionDto> {
    return this.service.findByRaceId(raceId);
  }
}