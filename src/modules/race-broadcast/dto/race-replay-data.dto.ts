export class ReplayHorseFrameDto {
  horseId: string;
  progress: number;
  currentSpeed: number;
  lane: number;
}

export class ReplayTickDto {
  tickNumber: number;
  horses: ReplayHorseFrameDto[];
}

export class ReplayEventDto {
  tickNumber: number;
  eventType: string;
  primaryHorseId: string;
  secondaryHorseId: string | null;
}

export class ReplayResultDto {
  horseId: string;
  rawRank: number;
  finishedTime: Date;
}

export class RaceReplayDataDto {
  raceId: string;
  maxTick: number;
  tickIntervalMs: number; // pace gốc của race — FE dùng làm default speed, có thể tự đổi
  ticks: ReplayTickDto[];
  events: ReplayEventDto[];
  results: ReplayResultDto[];
}