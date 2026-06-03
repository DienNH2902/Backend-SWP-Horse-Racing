import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'system_alert' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'Thông báo hệ thống' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Nội dung thông báo' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}
