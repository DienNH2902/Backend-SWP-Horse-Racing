import {
  IsEnum,
  IsString,
  IsOptional,
  IsMongoId,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportCategory } from 'src/constants/reportCategoryEnum.enum';

export class CreateReportDto {
  @ApiProperty({
    enum: ReportCategory,
    description: 'Phân loại sự cố hệ thống cần tố cáo',
  })
  @IsEnum(ReportCategory)
  category: ReportCategory;

  @ApiProperty({
    description: 'Mô tả chi tiết diễn biến lỗi hoặc vấn đề gặp phải',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    description: 'ID cuộc đua hoặc phiên đặt cược liên quan nếu có',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  relatedRaceId?: string;
}
