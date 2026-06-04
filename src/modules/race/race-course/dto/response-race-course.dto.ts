import { Expose, Transform } from 'class-transformer';
 
export class ResponseRaceCourseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;
 
  @Expose()
  name: string;
 
  @Expose()
  location: string;
 
  @Expose()
  trackType: string;
 
  @Expose()
  distance: number;
 
  @Expose()
  description: string;
 
  @Expose()
  createdAt: Date;
}