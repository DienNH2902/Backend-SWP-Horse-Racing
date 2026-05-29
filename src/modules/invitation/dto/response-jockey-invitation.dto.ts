import { Expose, Transform } from 'class-transformer';
 
export class ResponseJockeyInvitationDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;
 
  @Expose()
  @Transform(({ obj }) => obj.tournamentId?._id?.toString() || obj.tournamentId?.toString())
  tournamentId: string;
 
  @Expose()
  @Transform(({ obj }) => obj.horseOwnerId?._id?.toString() || obj.horseOwnerId?.toString())
  horseOwnerId: string;
 
  @Expose()
  @Transform(({ obj }) => obj.horseId?._id?.toString() || obj.horseId?.toString())
  horseId: string;
 
  @Expose()
  @Transform(({ obj }) => obj.jockeyId?._id?.toString() || obj.jockeyId?.toString())
  jockeyId: string;
 
  @Expose()
  @Transform(({ obj }) => obj.jockeyId?.fullName)
  jockeyName: string;
 
  @Expose()
  @Transform(({ obj }) => obj.horseId?.name)
  horseName: string;
 
  @Expose()
  proposeContractAmount: number;
 
  @Expose()
  proposeOwnerShareRate: number;
 
  @Expose()
  proposeJockeyShareRate: number;
 
  @Expose()
  message: string;
 
  @Expose()
  status: string;
 
  @Expose()
  invitedAt: Date;
 
  @Expose()
  createdAt: Date;
}