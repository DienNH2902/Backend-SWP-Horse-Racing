import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateVnPayPaymentDto {
  @ApiProperty({
    description: 'Số tiền cần nạp (Đơn vị: VNĐ)',
    example: 100000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(10000)
  amount: number;

  @ApiPropertyOptional({
    description: 'Mã ngân hàng (Ví dụ: NCB)',
    example: 'NCB',
  })
  @IsOptional()
  @IsString()
  bankCode?: string;
}
