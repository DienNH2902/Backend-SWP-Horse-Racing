import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRegistrationDto {
  @ApiProperty({ example: 'Thông tin ngựa không hợp lệ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}