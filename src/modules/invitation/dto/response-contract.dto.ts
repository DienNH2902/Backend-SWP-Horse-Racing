import { Expose, Transform } from 'class-transformer';
export class ResponseContractDto {
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
  @Transform(
    ({ obj }) =>
      obj.horseOwnerId?._id?.toString() || obj.horseOwnerId?.toString(),
  )
  horseOwnerId: string;

  @Expose()
  @Transform(
    ({ obj }) => obj.horseId?._id?.toString() || obj.horseId?.toString(),
  )
  horseId: string;

  @Expose()
  @Transform(
    ({ obj }) => obj.jockeyId?._id?.toString() || obj.jockeyId?.toString(),
  )
  jockeyId: string;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj.jockeyInvitationId?._id?.toString() ||
      obj.jockeyInvitationId?.toString(),
  )
  jockeyInvitationId: string;

  @Expose()
  contractAmount: number;

  @Expose()
  ownerShareRate: number;

  @Expose()
  jockeyShareRate: number;

  @Expose()
  status: string;

  @Expose()
  signedAt: Date;

  @Expose()
  createdAt: Date;
}
