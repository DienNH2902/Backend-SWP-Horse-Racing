import {
  Controller,
  Patch,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { RawResultService } from './raw-result.service';
import { ConfirmFinalRankDto } from './dto/confirm-final-rank.dto';

@ApiTags('Raw Results')
@Controller('raw-results')
export class RawResultController {
  constructor(private readonly rawResultService: RawResultService) {}

  @Patch(':raceId/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.REFEREE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'REFEREE xác nhận kết quả cuối cùng, có thể loại ngựa vi phạm',
  })
  confirmFinalRank(
    @Param('raceId') raceId: string,
    @Body() dto: ConfirmFinalRankDto,
    @Request() req: any,
  ) {
    const refereeId = req.user._id as string;
    return this.rawResultService.confirmFinalRank(raceId, refereeId, dto);
  }

  @Get(':raceId/raw')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.REFEREE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'REFEREE xem kết quả thô trước khi confirm' })
  getRawResults(@Param('raceId') raceId: string) {
    return this.rawResultService.getRawResults(raceId);
  }

  @Get(':raceId/final')
  @ApiOperation({
    summary: 'Lấy bảng xếp hạng cuối cùng của 1 RACE',
  })
  getFinalResults(@Param('raceId') raceId: string) {
    return this.rawResultService.getFinalResults(raceId);
  }
}