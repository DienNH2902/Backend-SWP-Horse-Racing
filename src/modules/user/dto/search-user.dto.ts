import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SearchUserDto {
  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo họ và tên (fullName)',
    example: 'Nguyễn Văn A',
  })
  @IsOptional()
  @IsString()
  fullName?: string;
}
