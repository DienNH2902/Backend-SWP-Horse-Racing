import { Expose, Transform, Type } from 'class-transformer';

class HorseStatsDto {
  @Expose()
  winRate: number;

  @Expose()
  totalWin: number;

  @Expose()
  totalRace: number;
}

class HorseRaceHistoryItemDto {
  @Expose()
  @Transform(({ obj }) => obj.raceId?._id?.toString())
  raceId: string;

  @Expose()
  @Transform(({ obj }) => obj.raceId?.name)
  raceName: string;

  @Expose()
  @Transform(({ obj }) => obj.raceId?.date)
  raceDate: Date;

  @Expose()
  @Transform(({ obj }) => obj.raceId?.tournamentId?._id?.toString())
  tournamentId: string;

  @Expose()
  @Transform(({ obj }) => obj.raceId?.tournamentId?.title)
  tournamentName: string;

  @Expose()
  rawRank: number;

  @Expose()
  finalRank: number;
}

export class ResponseHorseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  @Expose()
  name: string;

  @Expose()
  color: string;

  @Expose()
  @Transform(({ value }) => value || '')
  imageUrl: string;

  @Expose()
  horseStatus: string;

  @Expose()
  height: number;

  @Expose()
  weight: number;

  @Expose()
  @Transform(({ obj }) => obj.userId?._id?.toString() || obj.userId?.toString())
  userId: string;

  @Expose()
  @Transform(({ obj }) => obj.userId?.fullName)
  ownerName: string;

  @Expose()
  @Transform(({ obj }) => obj.userId?.email)
  ownerEmail: string;

  @Expose()
  @Type(() => HorseStatsDto)
  stats: HorseStatsDto;

  @Expose()
  @Type(() => HorseRaceHistoryItemDto)
  historyRace: HorseRaceHistoryItemDto[];
}