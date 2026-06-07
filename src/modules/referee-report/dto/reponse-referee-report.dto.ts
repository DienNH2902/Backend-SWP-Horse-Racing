
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { RefereeReportType } from '../../../constants/refereeReportType.enum';


export class RefereeReportResponseDto {
  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;
 
  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => obj.raceId?.toString())
  raceId: string;
 
  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => obj.refereeId?.toString())
  refereeId: string;
 
  @ApiProperty({ nullable: true })
  @Expose()
  @Transform(({ obj }) => obj.rawResultId?.toString() ?? null)
  rawResultId: string | null;
 
  @ApiProperty({ enum: RefereeReportType })
  @Expose()
  type: RefereeReportType;
 
  @ApiProperty({ nullable: true })
  @Expose()
  reason: string | null;
 
  @ApiProperty()
  @Expose()
  createAt: Date;
}