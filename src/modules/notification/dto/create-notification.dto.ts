import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotificationTitleEnum } from 'src/constants/notificationTitleEnum.enum';
import { NotificationTypeEnum } from 'src/constants/notificationTypeEnum.enum';

export class CreateNotificationDto {
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    enum: NotificationTypeEnum,
    example: NotificationTypeEnum.SYSTEM_ALERT,
  })
  @IsEnum(NotificationTypeEnum)
  @IsNotEmpty()
  type: NotificationTypeEnum;

  @ApiProperty({
    enum: NotificationTitleEnum,
    example: NotificationTitleEnum.SYSTEM_ALERT,
  })
  @IsEnum(NotificationTitleEnum)
  @IsNotEmpty()
  title: NotificationTitleEnum;

  @ApiProperty({ example: 'Nội dung thông báo' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}
