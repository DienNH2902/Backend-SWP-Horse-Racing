import { Expose, Transform } from 'class-transformer';

export class ResponseJockeyLicenseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

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
