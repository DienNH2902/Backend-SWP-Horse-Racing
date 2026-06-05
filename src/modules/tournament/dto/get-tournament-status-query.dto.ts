import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TournamentStatusEnum } from 'src/constants/tournamentStatusEnum.enum';

export class GetTournamentsQueryDto {
  @ApiPropertyOptional({
    enum: TournamentStatusEnum,
    description: 'Lọc giải đấu theo trạng thái hệ thống',
  })
  @IsEnum(TournamentStatusEnum)
  @IsOptional()
  status?: TournamentStatusEnum;
}
