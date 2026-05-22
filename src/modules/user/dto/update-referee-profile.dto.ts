import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

export class UpdateRefereeProfileDto {
  @ApiProperty({ example: 4, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceYears?: number;

  @ApiProperty({ example: 'International Referee Level 1', required: false })
  @IsOptional()
  @IsString()
  certification?: string;
}

export class UpdateRefereeDto extends IntersectionType(
  UpdateUserDto,
  UpdateRefereeProfileDto,
) {}
