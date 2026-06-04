import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
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

  /**
   * Referee điền thông tin điều kiện trước khi race bắt đầu
   * Nếu đã có sẵn course phù hợp thì chọn, không cần điền lại
   */
  @Post()
  @Roles(RoleEnum.REFEREE)
  @ApiOperation({
    summary: 'Referee tạo thông tin điều kiện cho race (weather, trackCondition, windSpeed)',
  })
  create(
    @Body() dto: CreateRaceConditionDto,
  ): Promise<ResponseRaceConditionDto> {
    return this.service.create(dto);
  }

  /**
   * Referee cập nhật nếu điều kiện thay đổi
   */
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

  /**
   * Xem điều kiện của race — referee / admin đều xem được
   */
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