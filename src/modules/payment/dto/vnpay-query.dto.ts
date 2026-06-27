// src/payment/dto/vnpay-query.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class VnPayQueryDto {
  @ApiProperty({
    description: 'Mã định danh giao dịch (userId_amount_timestamp)',
  })
  @IsString()
  vnp_TxnRef: string;

  @ApiProperty({ description: 'Số tiền thanh toán (đã nhân 100 từ VNPay)' })
  @IsString()
  vnp_Amount: string;

  @ApiProperty({
    description: 'Mã phản hồi kết quả giao dịch (00 là thành công)',
  })
  @IsString()
  vnp_ResponseCode: string;

  @ApiProperty({ description: 'Mã ngân hàng thanh toán', required: false })
  @IsString()
  @IsOptional()
  vnp_BankCode?: string;

  @ApiProperty({ description: 'Thời gian thanh toán', required: false })
  @IsString()
  @IsOptional()
  vnp_PayDate?: string;

  @ApiProperty({
    description: 'Mã giao dịch tại hệ thống VNPay',
    required: false,
  })
  @IsString()
  @IsOptional()
  vnp_TransactionNo?: string;

  @ApiProperty({
    description: 'Mã phản hồi trạng thái giao dịch',
    required: false,
  })
  @IsString()
  @IsOptional()
  vnp_TransactionStatus?: string;

  @ApiProperty({ description: 'Mã loại thẻ/tài khoản', required: false })
  @IsString()
  @IsOptional()
  vnp_CardType?: string;

  @ApiProperty({ description: 'Thông tin mô tả giao dịch', required: false })
  @IsString()
  @IsOptional()
  vnp_OrderInfo?: string;

  @ApiProperty({
    description: 'Mã website của merchant tại hệ thống VNPay',
    required: false,
  })
  @IsString()
  @IsOptional()
  vnp_TmnCode?: string;

  @ApiProperty({
    description: 'Mã giao dịch tại hệ thống ngân hàng',
    required: false,
  })
  @IsString()
  @IsOptional()
  vnp_BankTranNo?: string;

  @ApiProperty({ description: 'Chuỗi mã hóa kiểm tra bảo mật' })
  @IsString()
  vnp_SecureHash: string;
}
