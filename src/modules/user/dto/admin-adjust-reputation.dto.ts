import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class AdjustReputationPointsDto {
  @ApiProperty({
    description:
      'Số điểm uy tín cần cộng hoặc trừ (Số dương để cộng, số âm để trừ)',
    example: 10,
    type: Number,
  })
  @IsNotEmpty({ message: 'Số điểm uy tín không được để trống' })
  @IsNumber({}, { message: 'Số điểm uy tín phải là kiểu số' })
  amount: number;
}
