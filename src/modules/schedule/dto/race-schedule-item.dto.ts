import { Expose, Transform } from 'class-transformer';
import { RaceStatusEnum } from 'src/constants/raceStatus.enum';

export class RaceScheduleItemDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  raceId: string;

  @Expose()
  @Transform(({ obj }) => obj.name)
  raceName: string;

  @Expose()
  date: Date;

  @Expose()
  startTime: Date;

  @Expose()
  status: RaceStatusEnum;

  @Expose()
  @Transform(({ obj }) => obj.tournamentId?._id?.toString())
  tournamentId: string;

  @Expose()
  @Transform(({ obj }) => obj.tournamentId?.title)
  tournamentName: string;

  @Expose()
  @Transform(({ obj }) => obj.raceCourseId?.name)
  raceCourseName: string;

  @Expose()
  totalSlots: number;

  @Expose()
  filledSlots: number;

  @Expose()
  availableSlots: number;
}