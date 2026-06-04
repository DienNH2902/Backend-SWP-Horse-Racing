import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { NotificationRepository } from './notification.repository';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ResponseNotificationDto } from './dto/response-notification.dto';
import { Types } from 'mongoose';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  private toResponse(data: any): ResponseNotificationDto {
    return plainToInstance(ResponseNotificationDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<ResponseNotificationDto> {
    const notification = await this.notificationRepository.create({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
    });
    return this.toResponse(notification);
  }

  async getMyNotifications(userId: string): Promise<ResponseNotificationDto[]> {
    const notifications =
      await this.notificationRepository.findByUserId(userId);
    return notifications.map((n) => this.toResponse(n));
  }

  async markAsRead(
    id: string,
    userId: string,
  ): Promise<ResponseNotificationDto> {
    const notification = await this.notificationRepository.markAsRead(
      id,
      userId,
    );
    if (!notification) throw new NotFoundException('Không tìm thấy thông báo');
    return this.toResponse(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.delete(id, userId);
    if (!notification) throw new NotFoundException('Không tìm thấy thông báo');
  }
}
