import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { RegistrationService } from './registration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import {
  CreateRegistrationDto,
  ApproveRegistrationDto,
  RejectRegistrationDto,
  ResponseRegistrationDto,
} from './dto';

// ─── HorseOwner routes ────────────────────────────────────────────────────────

@ApiTags('Registrations')
@Controller('registrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.HORSE_OWNER)
  @ApiOperation({ summary: 'Chủ ngựa đăng ký tham gia giải đấu' })
  create(
    @Body() dto: CreateRegistrationDto,
    @Request() req: any,
  ): Promise<ResponseRegistrationDto> {
    return this.registrationService.createRegistration(
      dto,
      req.user._id as string,
    );
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.HORSE_OWNER)
  @ApiOperation({ summary: 'Chủ ngựa xem danh sách đăng ký của mình' })
  @ApiQuery({ name: 'tournamentId', required: false })
  getMyRegistrations(
    @Request() req: any,
    @Query('tournamentId') tournamentId?: string,
  ): Promise<ResponseRegistrationDto[]> {
    return this.registrationService.getMyRegistrations(
      req.user._id as string,
      tournamentId,
    );
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.HORSE_OWNER)
  @ApiOperation({ summary: 'Chủ ngựa xem chi tiết một đăng ký' })
  @ApiParam({ name: 'id', description: 'Registration ID' })
  getOne(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ResponseRegistrationDto> {
    return this.registrationService.getRegistrationById(
      id,
      req.user._id as string,
    );
  }
}

// ─── Admin routes ─────────────────────────────────────────────────────────────

@ApiTags('Admin — Registrations')
@Controller('admin/registrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.ADMIN)
@ApiBearerAuth()
export class AdminRegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin xem danh sách đăng ký (filter by status, tournamentId)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'confirmed', 'rejected'],
  })
  @ApiQuery({ name: 'tournamentId', required: false })
  getAll(
    @Query('status') status?: string,
    @Query('tournamentId') tournamentId?: string,
  ): Promise<ResponseRegistrationDto[]> {
    return this.registrationService.adminGetAll({ status, tournamentId });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Admin xem chi tiết đăng ký kèm thông tin horse, jockey, owner',
  })
  @ApiParam({ name: 'id', description: 'Registration ID' })
  getOne(@Param('id') id: string): Promise<ResponseRegistrationDto> {
    return this.registrationService.adminGetById(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({
    summary:
      'Admin duyệt đăng ký, assign gateNumber → trừ entryFee, tạo transaction, gửi notification',
  })
  @ApiParam({ name: 'id', description: 'Registration ID' })
  confirm(
    @Param('id') id: string,
    @Body() dto: ApproveRegistrationDto,
  ): Promise<ResponseRegistrationDto> {
    return this.registrationService.adminConfirm(id, dto);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Admin từ chối đăng ký kèm lý do, gửi notification cho owner',
  })
  @ApiParam({ name: 'id', description: 'Registration ID' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectRegistrationDto,
  ): Promise<ResponseRegistrationDto> {
    return this.registrationService.adminReject(id, dto);
  }

  @Patch(':id/waitlist')
  @ApiOperation({
    summary: 'Admin chấp nhận đăng ký vào pool (pending → waitlisted)',
  })
  @ApiParam({ name: 'id', description: 'Registration ID' })
  waitlist(@Param('id') id: string): Promise<ResponseRegistrationDto> {
    return this.registrationService.adminWaitlist(id);
  }
}

// ─── Race routes (Phase sau — Referee dùng) ───────────────────────────────────

// @ApiTags('Races')
// @Controller('races')
// @UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
// export class RaceRegistrationController {
//   constructor(private readonly registrationService: RegistrationService) {}

//   @Get(':id/registrations')
//   @ApiOperation({
//     summary: 'Xem danh sách horse confirmed trong race (dùng cho Referee)',
//   })
//   @ApiParam({ name: 'id', description: 'Race / Tournament ID' })
//   getConfirmed(@Param('id') id: string): Promise<ResponseRegistrationDto[]> {
//     return this.registrationService.getConfirmedByRace(id);
//   }
// }
