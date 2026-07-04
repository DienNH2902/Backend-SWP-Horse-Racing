import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportStatus } from 'src/constants/reportStatusEnum.enum';

export class ResolveReportDto {
  @ApiProperty({
    enum: [
      ReportStatus.RESOLVED,
      ReportStatus.REJECTED,
      ReportStatus.INVESTIGATING,
    ],
  })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiProperty({
    description: 'Lời nhắn phản hồi hoặc lý do giải quyết/từ chối của Admin',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  adminNotes?: string;
}
