import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RaceCondition, RaceConditionDocument } from './schemas/race-condition.schema';
import { CreateRaceConditionDto, UpdateRaceConditionDto } from './dto'; 

@Injectable()
export class RaceConditionRepository {
  constructor(
    @InjectModel(RaceCondition.name)
    private readonly raceConditionModel: Model<RaceConditionDocument>,
  ) {}

  async create(dto: CreateRaceConditionDto): Promise<RaceConditionDocument> {
    const condition = new this.raceConditionModel({
      ...dto,
      raceId: new Types.ObjectId(dto.raceId),
    });
    return condition.save();
  }

  async findByRaceId(raceId: string): Promise<RaceCondition | null> {
    return this.raceConditionModel
      .findOne({ raceId: new Types.ObjectId(raceId) })
      .lean()
      .exec() as Promise<RaceCondition | null>;
  }

  async updateByRaceId(
    raceId: string,
    dto: UpdateRaceConditionDto,
  ): Promise<RaceCondition | null> {
    return this.raceConditionModel
      .findOneAndUpdate(
        { raceId: new Types.ObjectId(raceId) },
        { $set: dto },
        { returnDocument: 'after' },
      )
      .lean()
      .exec() as Promise<RaceCondition | null>;
  }
}