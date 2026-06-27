import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ConfirmFinalRankDto {
  @ApiProperty({
    description: 'Danh sách horseId bị disqualify (để trống nếu không có)',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  disqualifiedHorseIds?: string[];
}