import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(data: Partial<Notification>): Promise<Notification> {
    return new this.notificationModel(data).save();
  }

  // Thêm hàm này vào NotificationRepository để lưu thông báo hàng loạt tối ưu hiệu năng
  async createMany(data: Partial<Notification>[]): Promise<Notification[]> {
    const result = await this.notificationModel.insertMany(data);
    return result as unknown as Notification[];
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    return this.notificationModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: { isRead: true } },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } },
    );
  }

  async delete(id: string, userId: string): Promise<Notification | null> {
    return this.notificationModel
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }
}
