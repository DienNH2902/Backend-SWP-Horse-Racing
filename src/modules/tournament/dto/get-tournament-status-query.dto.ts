import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TournamentStatusEnum } from 'src/constants/tournamentStatusEnum.enum';

export class GetTournamentsQueryDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên giải đấu' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: TournamentStatusEnum,
    description: 'Lọc giải đấu theo trạng thái hệ thống',
  })
  @IsEnum(TournamentStatusEnum)
  @IsOptional()
  status?: TournamentStatusEnum;
}
