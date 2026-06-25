import { Controller, Post, Get, Param, UseGuards, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RaceSimulationService } from './race-simulation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';

@ApiTags('Race Simulation')
@Controller('race-simulation')
export class RaceSimulationController {
  constructor(private readonly simulationService: RaceSimulationService) {}

  @Post(':raceId/run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.REFEREE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'REFEREE kích hoạt chạy simulation cho RACE',
  })
  async runSimulation(@Param('raceId') raceId: string) {
    return await this.simulationService.runSimulation(raceId);
  }

  @Get(':raceId/result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.REFEREE, RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xem kết quả simulation (rawResult + stats + events)',
  })
  async getResult(@Param('raceId') raceId: string) {
    return await this.simulationService.getSimulationResult(raceId);
  }

  @Delete(':raceId/reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[DEV] Reset simulation data — xóa ticks/events/results, race về Ready',
  })
  async resetSimulation(@Param('raceId') raceId: string) {
    return await this.simulationService.resetSimulation(raceId);
  }
}