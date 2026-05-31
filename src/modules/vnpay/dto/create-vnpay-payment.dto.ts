import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateVnPayPaymentDto {
  @ApiProperty({
    description:
      'Mã định danh giao dịch của hệ thống (Ví dụ: ID Hợp đồng, ID Hóa đơn)',
    example: 'CONTRACT_12345',
  })
  @IsNotEmpty()
  @IsString()
  referenceId: string;

  @ApiProperty({
    description: 'Số tiền cần thanh toán (Đơn vị: VNĐ)',
    example: 50000,
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description:
      'Mã ngân hàng muốn chỉ định (Ví dụ: NCB). Nếu bỏ trống sẽ chọn tại cổng VNPay.',
    example: 'NCB',
  })
  @IsOptional()
  @IsString()
  bankCode?: string;
}
