import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RaceCourseController } from './race-course.controller';
import { RaceCourseService } from './race-course.service';
import { RaceCourseRepository } from './race-course.repository';
import { RaceCourse, RaceCourseSchema } from './schemas/race-course.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RaceCourse.name, schema: RaceCourseSchema },
    ]),
  ],
  controllers: [RaceCourseController],
  providers: [RaceCourseService, RaceCourseRepository],
  exports: [RaceCourseService],
})
export class RaceCourseModule {}