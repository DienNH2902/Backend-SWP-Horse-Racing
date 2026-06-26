import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class UpdateBetDto {
  @ApiProperty({ example: '6a26a4b470b601942c102705' })
  @IsString()
  @IsNotEmpty()
  horseId: string;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(1)
  pointsWagered: number;
}
