import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  Max,
} from 'class-validator';

export class CreateHorseDto {
  @ApiProperty({ example: 'Xích Thố' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Đỏ hạt dẻ' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({
    example: '',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 1.65 })
  @IsNumber()
  @Min(0.5, { message: 'Chiều cao phải tối thiểu 0.5m' })
  @Max(2.5, { message: 'Chiều cao không được vượt quá 2.5m' })
  height: number;

  @ApiProperty({ example: 450 })
  @IsNumber()
  @Min(50, { message: 'Cân nặng phải tối thiểu 50kg' })
  @Max(1500, { message: 'Cân nặng không được vượt quá 1500kg' })
  weight: number;
}
