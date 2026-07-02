import { Expose, Transform } from 'class-transformer';
import { RaceStatusEnum } from 'src/constants/raceStatus.enum';

export class RaceScheduleItemDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  raceId: string;

  @Expose()
  date: Date;

  @Expose()
  startTime: Date;

  @Expose()
  status: RaceStatusEnum;

  @Expose()
  @Transform(({ obj }) => obj.tournamentId?.name)
  tournamentName: string;

  @Expose()
  @Transform(({ obj }) => obj.raceCourseId?.name)
  raceCourseName: string;
}