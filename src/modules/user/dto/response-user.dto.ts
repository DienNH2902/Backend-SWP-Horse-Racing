import { Exclude, Expose, Transform } from 'class-transformer';

export class ResponseUserDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  @Expose() fullName: string;
  @Expose() email: string;
  @Expose() phoneNumber: string;
  @Expose() address: string;
  @Expose() avatar: string;
  @Expose() dateOfBirth: Date;

  @Expose() gender: number;
  @Expose() role: string;
  @Expose() status: string;

  @Expose() licenseNumber?: string;
  @Expose() weight?: number;
  @Expose() stableName?: string;
  @Expose() balance?: number;

  @Exclude()
  password: string;

  @Exclude()
  __v: number;
}
