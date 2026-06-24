import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RoundAdvancement,
  RoundAdvancementDocument,
} from './schemas/round-advancement.schema';

@Injectable()
export class RoundAdvancementRepository {
  constructor(
    @InjectModel(RoundAdvancement.name)
    private readonly model: Model<RoundAdvancementDocument>,
  ) {}

  async create(data: Partial<RoundAdvancement>): Promise<RoundAdvancement> {
    return new this.model(data).save();
  }

  async findByToRaceId(toRaceId: string): Promise<RoundAdvancement[]> {
    return this.model
      .find({ toRaceId: new Types.ObjectId(toRaceId) })
      .populate('horseId fromRaceId')
      .lean()
      .exec();
  }

  async existsByFromRaceAndHorse(
    fromRaceId: string,
    horseId: string,
  ): Promise<boolean> {
    const count = await this.model.countDocuments({
      fromRaceId: new Types.ObjectId(fromRaceId),
      horseId: new Types.ObjectId(horseId),
    });
    return count > 0;
  }
}