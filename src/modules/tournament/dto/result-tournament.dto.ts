import { RawResultStatus } from "src/constants/rawResultStatus.enum";

export class RaceResultItemDto {
  resultId: string;
  finalRank: number;
  rawRank: number;
  status: RawResultStatus;
  finishedTime: Date;
  horseId: string;
  horseName: string;
  jockeyId: string;
  jockeyName: string;
}

export class RaceWithResultsDto {
  raceId: string;
  raceName: string;
  roundNumber: number;
  raceOrder: number;
  status: string;
  date: Date;
  startTime: Date;
  results: RaceResultItemDto[];
}