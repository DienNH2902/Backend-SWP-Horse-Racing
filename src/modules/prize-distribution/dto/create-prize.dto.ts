import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreatePrizeDto {
  @ApiProperty({ description: 'ID của Tournament' })
  @IsNotEmpty()
  @IsMongoId()
  tournamentId: string;

  @ApiProperty({ description: 'Tên giải thưởng' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Số tiền giải thưởng' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;
}