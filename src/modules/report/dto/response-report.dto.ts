import { Expose, Transform } from 'class-transformer';

export class ResponseReportDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  //   @Expose()
  //   @Transform(({ obj }) => obj._id?.toString())
  //   userId: string;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.userId && typeof obj.userId === 'object') {
      return {
        _id: obj.userId._id?.toString() as string,
        fullName: obj.userId.fullName as string,
        email: obj.userId.email as string,
      };
    }
    return obj.userId?.toString();
  })
  userId: string;

  @Expose()
  category: string;

  @Expose()
  description: string;

  @Expose()
  @Transform(({ obj }) => obj.relatedRaceId._id?.toString())
  relatedRaceId?: string;

  @Expose()
  status: string;

  @Expose()
  adminNotes?: string;

  @Expose()
  @Transform(({ obj }) => obj.resolvedBy?.toString())
  resolvedBy?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
