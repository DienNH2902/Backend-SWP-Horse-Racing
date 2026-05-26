import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateHorseDto {
  @ApiProperty({ example: 'Xích Thố' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Đỏ hạt dẻ' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ example: 1.65 })
  @IsNumber()
  @Min(0)
  height: number;

  @ApiProperty({ example: 450 })
  @IsNumber()
  @Min(0)
  weight: number;
}
