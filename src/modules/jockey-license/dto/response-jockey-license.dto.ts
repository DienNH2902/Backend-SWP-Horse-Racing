import { Expose, Transform } from 'class-transformer';

export class ResponseJockeyLicenseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj.jockeyProfileId?._id?.toString() || obj.jockeyProfileId?.toString(),
  )
  jockeyProfileId: string;

  // @Expose()
  // @Transform(({ obj }) => obj.userId?._id?.toString() || obj.userId?.toString())
  // userId: string;

  // @Expose()
  // @Transform(({ obj }) => {
  //   // Nếu jockeyProfileId là Object đã populate, lấy _id của nó ra
  //   if (obj.jockeyProfileId && typeof obj.jockeyProfileId === 'object') {
  //     return obj.jockeyProfileId._id?.toString();
  //   }
  //   return obj.jockeyProfileId?.toString();
  // })
  // jockeyProfileId: string;

  // Thuộc tính mới: Tự động trích xuất userId từ sâu trong object lồng
  @Expose()
  @Transform(({ obj }) => {
    if (obj.jockeyProfileId && typeof obj.jockeyProfileId === 'object') {
      // Trường hợp deep populate: obj.jockeyProfileId.userId
      return obj.jockeyProfileId.userId?.toString();
    }
    return null;
  })
  userId: string;

  @Expose()
  licenseCode: string;

  @Expose()
  licenseUrl: string;

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
  racingStartDate: string;
}
