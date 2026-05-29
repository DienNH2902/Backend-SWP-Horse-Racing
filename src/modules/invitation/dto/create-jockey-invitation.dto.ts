import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
 
export class CreateJockeyInvitationDto {
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  @IsNotEmpty()
  tournamentId: string;
 
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d1' })
  @IsMongoId()
  @IsNotEmpty()
  horseId: string;
 
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d2' })
  @IsMongoId()
  @IsNotEmpty()
  jockeyId: string;
 
  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @Min(0)
  proposeContractAmount: number;
 
  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(0)
  @Max(100)
  proposeOwnerShareRate: number;
 
  @ApiProperty({ example: 40 })
  @IsNumber()
  @Min(0)
  @Max(100)
  proposeJockeyShareRate: number;
 
  @ApiProperty({ example: 'Mời bạn tham gia giải đua tháng 6', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}