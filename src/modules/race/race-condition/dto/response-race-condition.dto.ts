import { Expose, Transform } from 'class-transformer';
 
export class ResponseRaceConditionDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;
 
  @Expose()
  @Transform(({ obj }) => obj.raceId?._id?.toString() || obj.raceId?.toString())
  raceId: string;
 
  @Expose()
  weather: string;
 
  @Expose()
  trackCondition: string;
 
  @Expose()
  windSpeed: number;
 
  @Expose()
  createdAt: Date;
}