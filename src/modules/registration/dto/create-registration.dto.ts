import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateRegistrationDto {
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  @IsNotEmpty()
  jockeyInvitationId: string;

  @ApiProperty({ example: 500000, description: 'Phí tham gia giải đấu' })
  @IsNumber()
  @Min(0)
  entryFee: number;

  @ApiProperty({ example: 3, description: 'Số ô chuồng xuất phát' })
  @IsNumber()
  @Min(1)
  gateNumber: number;
}