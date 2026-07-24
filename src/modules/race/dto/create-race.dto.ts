import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Thông tin 1 race trong batch
 */
export class RaceItemDto {
  @ApiProperty({ example: 'Vòng 1 - Race 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-07-15T08:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  date: string;
}

/**
 * Batch tạo nhiều race cùng lúc cho vòng 1
 */
export class CreateRaceBatchDto {
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d0' })
  @IsString()
  @IsNotEmpty()
  tournamentId: string;

  @ApiProperty({ type: [RaceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RaceItemDto)
  races: RaceItemDto[];
}
