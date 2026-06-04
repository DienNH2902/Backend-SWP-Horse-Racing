import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TransactionTypeEnum } from 'src/constants/transactionType.enum';

export class CreateTransactionDto {
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({
    example: '6650a1b2c3d4e5f6a7b8c9d1',
    required: false,
    description: 'Null nghĩa là Platform',
  })
  @IsMongoId()
  @IsOptional()
  receiverId?: string;

  @ApiProperty({ example: 'Nạp tiền vào tài khoản' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    enum: TransactionTypeEnum,
    example: TransactionTypeEnum.DEPOSIT,
  })
  @IsEnum(TransactionTypeEnum)
  @IsNotEmpty()
  type: TransactionTypeEnum;
}
