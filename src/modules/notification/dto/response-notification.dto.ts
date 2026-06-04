import { Expose, Transform } from 'class-transformer';

export class ResponseNotificationDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  @Expose()
  @Transform(({ obj }) => obj.userId?.toString())
  userId: string;

  @Expose()
  type: string;

  @Expose()
  title: string;

  @Expose()
  content: string;

  @Expose()
  isRead: boolean;

  @Expose()
  createdAt: Date;
}
