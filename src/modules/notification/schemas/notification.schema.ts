import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: NotificationTypeEnum,
    required: true,
    trim: true,
  })
  type: NotificationTypeEnum;

  @Prop({
    type: String,
    enum: NotificationTitleEnum,
    required: true,
    trim: true,
  })
  title: NotificationTitleEnum;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ default: false })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
