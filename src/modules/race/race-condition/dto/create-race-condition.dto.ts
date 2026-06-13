import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { WeatherEnum, TrackConditionEnum } from '../schemas/race-condition.schema';
 
export class CreateRaceConditionDto {
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  @IsNotEmpty()
  raceId: string;
 
  @ApiProperty({ enum: WeatherEnum, example: WeatherEnum.SUNNY })
  @IsEnum(WeatherEnum)
  weather: WeatherEnum;
 
  @ApiProperty({ enum: TrackConditionEnum, example: TrackConditionEnum.GOOD })
  @IsEnum(TrackConditionEnum)
  trackCondition: TrackConditionEnum;
 
  @ApiProperty({ example: 3, description: 'Tốc độ gió (km/h)' })
  @IsNumber()
  @Min(0)
  windSpeed: number;
}