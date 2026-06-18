import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RaceBroadcastService } from './race-broadcast.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from 'src/constants/roleEnum.enum';

@ApiTags('Race Broadcast')
@Controller('race-broadcast')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RaceBroadcastController {
  constructor(private readonly broadcastService: RaceBroadcastService) {}

  // ── REFEREE: Live broadcast ───────────────────────────────────────────────
  @Post(':raceId/start')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.REFEREE)
  @ApiOperation({
    summary: 'REFEREE bắt đầu broadcast live race qua WebSocket',
    description:
      'Race phải ở trạng thái "Simulated". ' +
      'fromTick=0 mặc định. Dùng fromTick > 0 để resume nếu crash.',
  })
  @ApiParam({ name: 'raceId' })
  @ApiQuery({ name: 'fromTick', required: false, example: 0 })
  async startBroadcast(
    @Param('raceId') raceId: string,
    @Query('fromTick') fromTick?: string,
  ) {
    const startFrom = fromTick ? parseInt(fromTick, 10) : 0;
    return await this.broadcastService.startBroadcast(raceId, startFrom);
  }

  // ── ALL ROLES: Replay sau khi race kết thúc ───────────────────────────────
  @Post(':raceId/replay')
  @ApiOperation({
    summary: 'Xem lại race đã kết thúc (tất cả role)',
    description:
      'Race phải ở trạng thái "Finished" hoặc "Ongoing". ' +
      'Tạo 1 broadcast session riêng để replay — không ảnh hưởng live.',
  })
  @ApiParam({ name: 'raceId' })
  async replayBroadcast(@Param('raceId') raceId: string) {
    return await this.broadcastService.startReplay(raceId);
  }

  // ── Check status ──────────────────────────────────────────────────────────
  @Get(':raceId/status')
  @ApiOperation({ summary: 'Kiểm tra race có đang broadcast không' })
  @ApiParam({ name: 'raceId' })
  getBroadcastStatus(@Param('raceId') raceId: string) {
    return {
      raceId,
      isBroadcasting: this.broadcastService.isBroadcasting(raceId),
    };
  }
}