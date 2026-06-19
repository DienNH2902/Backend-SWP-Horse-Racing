import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { StreakService } from './streak.service';
import { ResponseStreakDto } from './dto/response-streak.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiOperation } from '@nestjs/swagger';

@Controller('streak')
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  // API lấy trạng thái Streak hiện tại của User đang đăng nhập
  @Get('my-status')
  @UseGuards(JwtAuthGuard) // Bắt buộc phải đăng nhập mới lấy được thông tin
  @ApiOperation({ summary: 'Lấy streak của tài khoản hiện tại' })
  async getMyStreak(@Request() req: any): Promise<ResponseStreakDto> {
    const userId = req.user._id as string;
    return await this.streakService.getStreak(userId);
  }
}
