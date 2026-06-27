import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { PointsTransactionService } from './points-transaction.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResponsePointsTransactionDto } from './dto/response-points-transaction.dto';

@Controller('points-transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PointsTransactionController {
  constructor(private readonly transactionService: PointsTransactionService) {}

  @Get('my-history')
  @ApiOperation({
    summary: 'Lấy lịch sử biến động điểm của chính người dùng hiện tại',
  })
  @ApiResponse({ status: 200, type: [ResponsePointsTransactionDto] })
  async getMyHistory(
    @Request() req: any,
  ): Promise<ResponsePointsTransactionDto[]> {
    const userId = req.user._id as string;
    return await this.transactionService.getHistoryByUserId(userId);
  }
}
