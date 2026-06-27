import { Expose, Transform } from 'class-transformer';

export class ResponseRaceDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj.tournamentId?._id?.toString() || obj.tournamentId?.toString(),
  )
  tournamentId: string;

  @Expose()
  @Transform(({ obj }) => obj.tournamentId?.title)
  tournamentTitle: string;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj.refereeId?._id?.toString() || obj.refereeId?.toString() || null,
  )
  refereeId: string | null;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj.raceCourseId?._id?.toString() || obj.raceCourseId?.toString() || null,
  )
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

  // @Expose()
  // @Transform(({ obj }) => {
  //   if (!Array.isArray(obj.horses)) return [];
  //   return obj.horses.map((r: any) => ({
  //     horseId: r.horseId?._id?.toString() ?? r.horseId?.toString(),
  //     name: r.horseId?.name ?? null,
  //     jockeyId: r.jockeyId?._id?.toString() ?? r.jockeyId?.toString() ?? null,
  //     jockeyName: r.jockeyId?.name ?? null,
  //     gateNumber: r.gateNumber ?? null,
  //     status: r.status,
  //   }));
  // })
  // horses: {
  //   horseId: string;
  //   name: string;
  //   jockeyId: string | null;
  //   jockeyName: string | null;
  //   gateNumber: number | null;
  //   status: string;
  // }[];

  @Expose()
  @Transform(({ obj }) => {
    if (!Array.isArray(obj.participants)) return [];
    return obj.participants.map((p: any) => ({
      horseId: p.horseId?._id?.toString() || p.horseId?.toString() || null,
      // horseName: p.horseId?.name || null,
      jockeyId: p.jockeyId?._id?.toString() || p.jockeyId?.toString() || null,
      // jockeyName: p.jockeyId?.fullName || p.jockeyId?.name || null, // Phù hợp với cả 2 cách đặt tên trường của hệ thống
      gateNumber: p.gateNumber ?? null,
    }));
  })
  participants: {
    horseId: string | null;
    horseName: string | null;
    jockeyId: string | null;
    jockeyName: string | null;
    gateNumber: number | null;
  }[];

  @Expose()
  @Transform(({ obj }) => obj.totalSlots ?? null)
  totalSlots: number | null;

  @Expose()
  @Transform(({ obj }) => obj.filledSlots ?? null)
  filledSlots: number | null;

  @Expose()
  @Transform(({ obj }) =>
    obj.totalSlots != null && obj.filledSlots != null
      ? obj.totalSlots - obj.filledSlots
      : null,
  )
  availableSlots: number | null;
}
