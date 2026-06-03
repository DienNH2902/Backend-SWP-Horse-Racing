import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Expose, Transform } from 'class-transformer';

// ─── AssignRefereeDto ─────────────────────────────────────────────────────────
export class AssignRefereeDto {
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d2', description: 'User ID của referee' })
  @IsMongoId()
  @IsNotEmpty()
  refereeId: string;
}

// ─── BulkAssignHorsesDto ──────────────────────────────────────────────────────
export class BulkAssignHorsesDto {
  @ApiProperty({
    example: ['6650a1b2c3d4e5f6a7b8c9d3', '6650a1b2c3d4e5f6a7b8c9d4'],
    description: 'Danh sách Registration ID cần gán vào race. Status phải là WAITLISTED. gateNumber tự random.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  registrationIds: string[];
}

// ─── BulkAssignResultDto ──────────────────────────────────────────────────────
export class GateAssignmentDto {
  @Expose()
  registrationId: string;

  @Expose()
  gateNumber: number;
}

export class BulkAssignResultDto {
  @Expose()
  assigned: number;

  @Expose()
  skipped: number;

  @Expose()
  skippedReasons: string[];

  @Expose()
  gateAssignments: GateAssignmentDto[];
}