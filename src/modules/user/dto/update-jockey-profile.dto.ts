import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateJockeyProfileDto {
  @ApiProperty({ example: 54, required: false })
  @IsOptional()
  @IsNumber()
  @Min(30)
  weight?: number;

  @ApiProperty({ example: 163, required: false })
  @IsOptional()
  @IsNumber()
  @Min(100)
  height?: number;
}
