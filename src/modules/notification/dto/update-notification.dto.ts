import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateNotificationDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  isRead: boolean;
}
