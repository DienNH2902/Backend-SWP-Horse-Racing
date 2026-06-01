import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmRegistrationDto {
  @ApiProperty({
    example: 3,
    description: 'Số ô chuồng xuất phát admin chỉ định',
  })
  @IsNumber()
  @Min(1)
  @Max(20)
  gateNumber: number;
}
