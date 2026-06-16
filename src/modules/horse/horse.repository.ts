// src/modules/horse/horse.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { Horse, HorseDocument } from './schemas/horse.schema';
import { HorseStatusEnum } from 'src/constants/horseStatusEnum.enum';

@Injectable()
export class HorseRepository {
  constructor(
    @InjectModel(Horse.name) private readonly horseModel: Model<HorseDocument>,
  ) {}

  async createHorse(data: Partial<Horse>): Promise<Horse> {
    return new this.horseModel(data).save();
  }

  async findAllHorse(): Promise<Horse[]> {
    return await this.horseModel.find().populate('userId').lean().exec();
  }

  async findAllMyHorse(userId: string): Promise<Horse[]> {
    return await this.horseModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId')
      .lean()
      .exec();
  }

  async findOneHorse(filter: QueryFilter<Horse>): Promise<Horse | null> {
    return await this.horseModel
      .findOne(filter)
      .populate('userId')
      .lean()
      .exec();
  }

  async updateHorseStatus(
    id: string,
    horseStatus: HorseStatusEnum,
  ): Promise<Horse | null> {
    return await this.horseModel
      .findByIdAndUpdate(
        id,
        { $set: { horseStatus } },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();
  }

  async findHorseByIdAndUpdate(
    id: string,
    updateData: UpdateQuery<Horse>,
  ): Promise<Horse | null> {
    return await this.horseModel
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .lean()
      .exec();
  }

  async deleteHorse(id: string): Promise<Horse | null> {
    return await this.horseModel.findByIdAndDelete(id).exec();
  }
}
