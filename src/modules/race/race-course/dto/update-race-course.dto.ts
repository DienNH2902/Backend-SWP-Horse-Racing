import { PartialType } from '@nestjs/swagger';
import { CreateRaceCourseDto } from './create-race-course.dto';

export class UpdateRaceCourseDto extends PartialType(CreateRaceCourseDto) {}
