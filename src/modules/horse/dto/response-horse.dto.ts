import { Expose, Transform } from 'class-transformer';

export class ResponseHorseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  //   @Expose()
  //   @Transform(({ obj }) => obj.userId?.toString() || obj.userId)
  //   userId: string;

  @Expose()
  name: string;

  @Expose()
  color: string;

  @Expose()
  @Transform(({ value }) => value || '')
  imageUrl: string;

  @Expose()
  horseStatus: string;

  @Expose()
  height: number;

  @Expose()
  weight: number;

  @Expose()
  winRate: number;

  @Expose()
  totalWin: number;

  // Trả về chuỗi ID thuần túy cho trường userId
  @Expose()
  @Transform(({ obj }) => obj.userId?._id?.toString() || obj.userId?.toString())
  userId: string;

  // Kéo thông tin fullName từ Object được populate ra ngoài thành thuộc tính phẳng
  @Expose()
  @Transform(({ obj }) => obj.userId?.fullName)
  ownerName: string;

  @Expose()
  @Transform(({ obj }) => obj.userId?.email)
  ownerEmail: string;
}
