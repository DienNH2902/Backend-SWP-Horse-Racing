import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PointsTransactionType } from 'src/constants/pointsTransactionTypeEnum.enum';

export class CreatePointsTransactionDto {
  userId: string;

  @IsEnum(PointsTransactionType)
  type: PointsTransactionType;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsNumber()
  balanceAfter: number;

  @IsString()
  reason: string;

  @IsOptional()
  rewardId?: string;
}
