import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveWithdrawalDto {
  @ApiPropertyOptional({
    example: 'Đã chuyển khoản thành công qua Internet Banking',
  })
  @IsString()
  @IsOptional()
  adminNote?: string;
}
