import { Expose, Transform } from 'class-transformer';
 
export class ResponseRaceDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;
 
  @Expose()
  @Transform(({ obj }) => obj.tournamentId?._id?.toString() || obj.tournamentId?.toString())
  tournamentId: string;
 
  @Expose()
  @Transform(({ obj }) => obj.tournamentId?.title)
  tournamentTitle: string;
 
  @Expose()
  @Transform(({ obj }) => obj.refereeId?._id?.toString() || obj.refereeId?.toString() || null)
  refereeId: string | null;
 
  @Expose()
  @Transform(({ obj }) => obj.raceCourseId?._id?.toString() || obj.raceCourseId?.toString() || null)
  raceCourseId: string | null;
 
  @Expose()
  name: string;
 
  @Expose()
  roundNumber: number;
 
  @Expose()
  raceOrder: number;
 
  @Expose()
  startTime: Date;
 
  @Expose()
  date: Date;
 
  @Expose()
  totalBettors: number;
 
  @Expose()
  status: string;
 
  @Expose()
  refereeConfirmedAt: Date;
 
  @Expose()
  simulatedAt: Date;
 
  @Expose()
  createdAt: Date;
}