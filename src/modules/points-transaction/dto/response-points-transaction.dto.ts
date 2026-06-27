import { Expose, Transform } from 'class-transformer';

export class ResponsePointsTransactionDto {
  @Expose()
  @Transform(({ value }) => value?.toString())
  _id: string;

  @Expose()
  @Transform(({ value }) => value?.toString())
  userId: string;

  @Expose()
  type: string;

  @Expose()
  amount: number;

  @Expose()
  balanceAfter: number;

  @Expose()
  reason: string;

  @Expose()
  @Transform(({ value }) => value?.toString())
  rewardId?: string;

  @Expose()
  createdAt: Date;
}
