import { PartialType } from '@nestjs/swagger';
import { CreateHorseDto } from './create-horse.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { HorseStatusEnum } from 'src/constants/horseStatusEnum.enum';

export class UpdateHorseDto extends PartialType(CreateHorseDto) {
  @ApiProperty({ enum: HorseStatusEnum, required: false })
  @IsEnum(HorseStatusEnum)
  @IsOptional()
  horseStatus?: HorseStatusEnum;

  @ApiProperty({ example: 15.5, required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  winRate?: number;

  @ApiProperty({ example: 3, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalWin?: number;
}
