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
export class RaceBroadcastController {
  constructor(private readonly broadcastService: RaceBroadcastService) {}

  // ── POST /:raceId/start ───────────────────────────────────────────────────
  @Post(':raceId/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.REFEREE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'REFEREE bắt đầu broadcast race realtime qua WebSocket',
    description:
      'Race phải ở trạng thái "Simulated". ' +
      'Server push tick mỗi 500ms xuống tất cả client đang xem race. ' +
      'fromTick=0 mặc định (broadcast từ đầu). ' +
      'Dùng fromTick > 0 để resume nếu server crash giữa chừng.',
  })
  @ApiParam({ name: 'raceId', description: 'Race ID' })
  @ApiQuery({
    name: 'fromTick',
    required: false,
    description: 'Resume từ tick N (mặc định 0)',
    example: 0,
  })
  async startBroadcast(
    @Param('raceId') raceId: string,
    @Query('fromTick') fromTick?: string,
  ) {
    const startFrom = fromTick ? parseInt(fromTick, 10) : 0;
    return await this.broadcastService.startBroadcast(raceId, startFrom);
  }

  // ── GET /:raceId/status ───────────────────────────────────────────────────
  @Get(':raceId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Kiểm tra race có đang broadcast không',
  })
  @ApiParam({ name: 'raceId', description: 'Race ID' })
  getBroadcastStatus(@Param('raceId') raceId: string) {
    return {
      raceId,
      isBroadcasting: this.broadcastService.isBroadcasting(raceId),
    };
  }
}