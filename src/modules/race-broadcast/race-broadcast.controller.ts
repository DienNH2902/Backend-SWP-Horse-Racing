import { Controller, Post, Get, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags
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
    if (!Number.isInteger(startFrom)) {
      throw new BadRequestException('fromTick phải là một số nguyên hợp lệ');
    }
    return await this.broadcastService.startBroadcast(raceId, startFrom);
  }

  // @Post(':raceId/replay')
  // @ApiOperation({
  //   summary: 'Xem lại race đã kết thúc (tất cả role)',
  //   description:
  //     'Race phải ở trạng thái "Finished" hoặc "Ongoing". ' +
  //     'Tạo 1 broadcast session riêng để replay — không ảnh hưởng live.',
  // })
  // @ApiParam({ name: 'raceId' })
  // async replayBroadcast(@Param('raceId') raceId: string) {
  //   return await this.broadcastService.startReplay(raceId);
  // }

  @Get(':raceId/replay-data')
  @ApiOperation({
    summary: 'Lấy toàn bộ dữ liệu để xem lại race (tất cả role)',
    description:
      'Race phải ở trạng thái "Finished" hoặc "Ongoing" và không đang live. ' +
      'Trả toàn bộ ticks/events/results 1 lần — không dùng WebSocket. ' +
      'FE tự chạy interval phía client để play/pause/tua (seek) tuỳ ý, ' +
      'độc lập hoàn toàn với người xem khác.',
  })
  @ApiParam({ name: 'raceId' })
  async getReplayData(@Param('raceId') raceId: string) {
    return await this.broadcastService.getReplayData(raceId);
  }
 
  @Get(':raceId/status')
  @ApiOperation({ summary: 'Kiểm tra race có đang broadcast không' })
  @ApiParam({ name: 'raceId' })
  async getBroadcastStatus(@Param('raceId') raceId: string) {
    const isBroadcasting = await this.broadcastService.isBroadcasting(raceId);
    return { raceId, isBroadcasting };
  }


  @Get('live')
  @ApiOperation({
    summary: 'Lấy danh sách race cho trang live broadcast',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  getLiveBroadcastRaces(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    if (!Number.isInteger(pageNum) || !Number.isInteger(limitNum)) {
      throw new BadRequestException('page và limit phải là số nguyên hợp lệ');
    }
    return this.broadcastService.getLiveBroadcastRaces(pageNum, limitNum);
  }
}
