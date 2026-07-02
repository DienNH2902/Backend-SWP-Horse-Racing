import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateBetDto {
  @ApiProperty({ example: '6a26a4b470b601942c102705' })
  @IsString()
  @IsNotEmpty()
  horseId: string;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(1)
  pointsWagered: number;

  @ApiProperty({
    example: true,
    description: 'Cập nhật trạng thái sử dụng thẻ bảo hiểm',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  useInsuranceCard?: boolean;
}
