import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TournamentStatusEnum } from 'src/constants/tournamentStatusEnum.enum';

export class UpdateTournamentStatusDto {
  @ApiProperty({
    enum: TournamentStatusEnum,
    example: TournamentStatusEnum.REGISTRATION,
  })
  @IsEnum(TournamentStatusEnum)
  @IsNotEmpty()
  status: TournamentStatusEnum;
}
