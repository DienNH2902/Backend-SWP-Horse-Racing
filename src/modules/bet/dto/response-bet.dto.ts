// src/bet/dto/response-bet.dto.ts
import { Expose, Transform } from 'class-transformer';

export class ResponseBetDto {
  @Expose()
  @Transform(({ value }) => value?.toString())
  _id: string;

  @Expose()
  @Transform(({ value }) => value?.toString())
  spectatorId: string;

  @Expose()
  @Transform(({ value }) => value?.toString())
  raceId: string;

  @Expose()
  @Transform(({ value }) => value?.toString())
  horseId: string;

  @Expose()
  horseWinRateAtBet: number;

  @Expose()
  bettorsOnHorseAtBet: number;

  @Expose()
  totalBettorsAtBet: number;

  @Expose()
  finalOdds: number;

  @Expose()
  pointsWagered: number;

  @Expose()
  pointsWon: number;

  @Expose()
  result: string;

  @Expose()
  placedAt: Date;
}
