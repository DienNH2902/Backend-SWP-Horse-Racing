import { RawResultStatus } from "src/constants/rawResultStatus.enum";
import { TrackTypeEnum } from "src/modules/race/race-course/schemas/race-course.schema";

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
  raceCourseName: string;
  trackType: TrackTypeEnum;
  distance: number;
  results: RaceResultItemDto[];
}