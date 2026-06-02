import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TrackTypeEnum } from '../schemas/race-course.schema';
 
export class CreateRaceCourseDto {
  @ApiProperty({ example: 'Trường đua Đại Nam' })
  @IsString()
  @IsNotEmpty()
  name: string;
 
  @ApiProperty({ example: 'Bình Dương' })
  @IsString()
  @IsNotEmpty()
  location: string;
 
  @ApiProperty({ enum: TrackTypeEnum, example: TrackTypeEnum.TURF })
  @IsEnum(TrackTypeEnum)
  trackType: TrackTypeEnum;
 
  @ApiProperty({ example: 1800, description: 'Khoảng cách (mét)' })
  @IsNumber()
  @Min(0)
  distance: number;
 
  @ApiProperty({ example: 'Đường đua cỏ thiên nhiên chuẩn quốc tế', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}