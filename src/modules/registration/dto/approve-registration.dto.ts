import { IsNumber, Min, Max, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveRegistrationDto {
  @ApiProperty({
    example: 3,
    description: 'Số ô chuồng xuất phát admin chỉ định',
  })
  @ApiProperty({ example: '1' })
  @IsMongoId()
  raceId: string;

  @ApiProperty({
    example: 3,
    description: 'Số ô chuồng xuất phát admin chỉ định',
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  gateNumber: number;
}
