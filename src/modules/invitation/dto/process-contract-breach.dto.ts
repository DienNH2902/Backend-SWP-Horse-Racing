import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProcessContractBreachDto {
  @ApiProperty({
    description: 'Trạng thái phê duyệt (true: Duyệt, false: Từ chối)',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isApproved: boolean;

  @ApiPropertyOptional({
    description:
      'Lý do xử lý của Admin (Bắt buộc hoặc khuyến nghị khi từ chối)',
    example: 'Bằng chứng không đủ điều kiện để xác minh vi phạm',
  })
  @IsOptional()
  @IsString()
  adminReason?: string;
}
