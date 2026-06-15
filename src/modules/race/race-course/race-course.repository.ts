import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RaceCourse, RaceCourseDocument } from './schemas/race-course.schema';
import { CreateRaceCourseDto, UpdateRaceCourseDto } from './dto';

@Injectable()
export class RaceCourseRepository {
  constructor(
    @InjectModel(RaceCourse.name)
    private readonly raceCourseModel: Model<RaceCourseDocument>,
  ) {}

  async create(dto: CreateRaceCourseDto): Promise<RaceCourseDocument> {
    const course = new this.raceCourseModel(dto);
    return course.save();
  }

  async findAll(): Promise<RaceCourse[]> {
    return this.raceCourseModel
      .find()
      .sort({ name: 1 })
      .lean()
      .exec() as Promise<RaceCourse[]>;
  }

  async findById(id: string): Promise<RaceCourse | null> {
    return this.raceCourseModel
      .findById(id)
      .lean()
      .exec() as Promise<RaceCourse | null>;
  }

  async update(
    id: string,
    dto: UpdateRaceCourseDto,
  ): Promise<RaceCourse | null> {
    return this.raceCourseModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .lean()
      .exec() as Promise<RaceCourse | null>;
  }
  
}