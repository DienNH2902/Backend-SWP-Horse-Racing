import { Expose, Transform } from 'class-transformer';

export class ResponseTransactionDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  @Expose()
  @Transform(
    ({ obj }) => obj.senderId?._id?.toString() || obj.senderId?.toString(),
  )
  senderId: string;

  @Expose()
  @Transform(({ obj }) => obj.senderId?.fullName)
  senderName: string;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj.receiverId?._id?.toString() ||
      obj.receiverId?.toString() ||
      'Platform',
  )
  receiverId: string;

  @Expose()
  @Transform(({ obj }) => obj.receiverId?.fullName || 'Hệ thống')
  receiverName: string;

  @Expose()
  content: string;

  @Expose()
  amount: number;

  @Expose()
  type: string;

  @Expose()
  createdAt: Date;
}
