import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';


export class CreateEndReportDto {
  @ApiPropertyOptional({
    description: 'ID của RawResult bị vi phạm (nếu có)',
  })
  @IsOptional()
  @IsMongoId()
  rawResultId?: string;
 
  @ApiPropertyOptional({
    description: 'Lý do vi phạm hoặc ghi chú của Referee',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}