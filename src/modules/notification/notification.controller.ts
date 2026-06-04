import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ResponseNotificationDto } from './dto/response-notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('internal')
  @ApiOperation({ summary: 'Tạo thông báo (Dành cho hệ thống nội bộ)' })
  create(@Body() dto: CreateNotificationDto): Promise<ResponseNotificationDto> {
    return this.notificationService.createNotification(dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Lấy danh sách thông báo của tôi' })
  getMyNotifications(@Request() req: any): Promise<ResponseNotificationDto[]> {
    return this.notificationService.getMyNotifications(req.user._id as string);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu 1 thông báo là đã đọc' })
  markAsRead(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ResponseNotificationDto> {
    return this.notificationService.markAsRead(id, req.user._id as string);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  markAllAsRead(@Request() req: any): Promise<void> {
    return this.notificationService.markAllAsRead(req.user._id as string);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa 1 thông báo' })
  delete(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.notificationService.deleteNotification(
      id,
      req.user._id as string,
    );
  }
}
