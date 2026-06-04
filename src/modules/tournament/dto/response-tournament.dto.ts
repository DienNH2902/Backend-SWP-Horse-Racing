import { Expose, Transform } from 'class-transformer';

export class ResponseTournamentDto {
  @Expose()
  @Transform(({ obj }) => obj._id.toString())
  _id: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  @Transform(({ value }) => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      const day = String(value.getDate()).padStart(2, '0');
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const year = value.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return value;
  })
  startDate: string;

  @Expose()
  @Transform(({ value }) => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      const day = String(value.getDate()).padStart(2, '0');
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const year = value.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return value;
  })
  endDate: string;

  @Expose()
  location: string;

  @Expose()
  status: string;

  @Expose()
  totalRounds: number;

  @Expose()
  horsesPerRace: number;

  @Expose()
  totalRaces: number;

  @Expose()
  entryFee: number;
}
