import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateBetDto {
  @ApiProperty({ example: '6a2bb0267070c17ca5757a0d' })
  @IsString()
  @IsNotEmpty()
  raceId: string;

  @ApiProperty({ example: '6a26a4f770b601942c102719' })
  @IsString()
  @IsNotEmpty()
  horseId: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  pointsWagered: number;
}
