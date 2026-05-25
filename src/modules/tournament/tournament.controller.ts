import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TournamentService } from './tournament.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { UpdateTournamentStatusDto } from './dto/update-tournament-status.dto';
import { ResponseTournamentDto } from './dto/response-tournament.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';

@ApiTags('Tournaments')
@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ADMIN tạo mới một giải đấu (Tournament)' })
  async create(
    @Body() dto: CreateTournamentDto,
  ): Promise<ResponseTournamentDto> {
    return await this.tournamentService.createTournament(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách tất cả các giải đấu công khai' })
  async getAll(): Promise<ResponseTournamentDto[]> {
    return await this.tournamentService.getAllTournament();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một giải đấu theo ID' })
  async getOne(@Param('id') id: string): Promise<ResponseTournamentDto> {
    return await this.tournamentService.getOneTournament(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ADMIN cập nhật cấu hình thông tin giải đấu' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentDto,
  ): Promise<ResponseTournamentDto> {
    return await this.tournamentService.updateTournament(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ADMIN thay đổi trạng thái vòng đời giải đấu' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentStatusDto,
  ): Promise<ResponseTournamentDto> {
    return await this.tournamentService.updateStatus(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ADMIN xóa hoàn toàn một giải đấu' })
  async remove(@Param('id') id: string) {
    return await this.tournamentService.removeTournament(id);
  }
}
