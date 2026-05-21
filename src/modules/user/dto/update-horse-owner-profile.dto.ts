import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateHorseOwnerProfileDto {
  @ApiProperty({ example: 'Golden Horse Stable', required: false })
  @IsOptional()
  @IsString()
  stableName?: string;

  @ApiProperty({ example: 'Quận 9, Thành phố Hồ Chí Minh', required: false })
  @IsOptional()
  @IsString()
  stableAddress?: string;
}
