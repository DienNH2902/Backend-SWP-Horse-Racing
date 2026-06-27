import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PrizeDistributionService } from './prize-distribution.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';

@ApiTags('Prize Distribution')
@Controller('prize-distribution')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PrizeDistributionController {
  constructor(
    private readonly prizeDistributionService: PrizeDistributionService,
  ) {}

  @Post(':raceId/distribute')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary:
      'ADMIN trao thưởng cho ngựa thắng — sau khi REFEREE đã confirm final rank',
  })
  @ApiParam({ name: 'raceId', description: 'Race ID (race round 2)' })
  async distribute(@Param('raceId') raceId: string): Promise<{ message: string }> {
    await this.prizeDistributionService.distributePrize(raceId);
    return { message: 'Trao thưởng thành công' };
  }
}