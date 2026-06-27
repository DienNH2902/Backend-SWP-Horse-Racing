import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, IsArray } from 'class-validator';


export class CreateEndReportDto {
  @ApiPropertyOptional({
    description: 'Danh sách ID của các RawResult bị vi phạm (nếu có)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  rawResultId?: string[];

  @ApiPropertyOptional({
    description: 'Lý do vi phạm hoặc ghi chú của Referee (áp dụng chung)',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}