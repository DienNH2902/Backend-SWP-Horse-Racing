import { Expose, Transform } from 'class-transformer';

export class ResponseRegistrationDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  @Expose()
  @Transform(({ obj }) => obj.jockeyInvitationId?._id?.toString() || obj.jockeyInvitationId?.toString())
  jockeyInvitationId: string;

  @Expose()
  @Transform(({ obj }) => obj.tournamentId?._id?.toString() || obj.tournamentId?.toString())
  tournamentId: string;

  @Expose()
  @Transform(({ obj }) => obj.tournamentId?.title)
  tournamentTitle: string;

  @Expose()
  @Transform(({ obj }) => obj.horseId?._id?.toString() || obj.horseId?.toString())
  horseId: string;

  @Expose()
  @Transform(({ obj }) => obj.horseId?.name)
  horseName: string;

  @Expose()
  @Transform(({ obj }) => obj.jockeyId?._id?.toString() || obj.jockeyId?.toString())
  jockeyId: string;

  @Expose()
  @Transform(({ obj }) => obj.jockeyId?.fullName)
  jockeyName: string;

  @Expose()
  @Transform(({ obj }) => obj.ownerId?._id?.toString() || obj.ownerId?.toString())
  ownerId: string;

  @Expose()
  @Transform(({ obj }) => obj.ownerId?.fullName)
  ownerName: string;

  @Expose()
  entryFee: number;

  @Expose()
  gateNumber: number;

  @Expose()
  status: string;

  @Expose()
  registeredAt: Date;

  @Expose()
  confirmedAt: Date;

  @Expose()
  rejectedReason: string;

  @Expose()
  rejectedAt: Date;

  @Expose()
  createdAt: Date;
}