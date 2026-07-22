export class PaginatedBroadcastRacesDto {
  data: BroadcastRaceItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class BroadcastParticipantDto {
  horseId: string;
  horseName: string;
  jockeyId: string;
  jockeyName: string;
  gateNumber: number;
}

export class BroadcastRaceItemDto {
  raceId: string;
  tournamentId: string;
  tournamentTitle: string;
  raceCourseName: string | null;
  name: string;
  roundNumber: number;
  raceOrder: number;
  date: Date;
  startTime: Date;
  status: string;
  totalBettors: number;
  totalSlots: number;
  filledSlots: number;
  availableSlots: number;
  isLive: boolean;
  isReplaying: boolean;
  participants: BroadcastParticipantDto[];
}