import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class AdjustPointsDto {
  @ApiProperty({
    description: 'Số điểm cần cộng hoặc trừ (Số dương để cộng, số âm để trừ)',
    example: 100, // Hoặc -50 nếu là điểm trừ
    type: Number,
  })
  @IsNotEmpty({ message: 'Số điểm không được để trống' })
  @IsNumber({}, { message: 'Số điểm phải là kiểu số' })
  amount: number;
}
