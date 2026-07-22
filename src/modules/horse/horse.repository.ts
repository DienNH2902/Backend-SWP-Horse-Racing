// src/modules/horse/horse.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  Model,
  QueryFilter,
  Types,
  UpdateQuery,
} from 'mongoose';
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

  // async findAllHorse(): Promise<Horse[]> {
  //   return await this.horseModel
  //     .find()
  //     .populate('userId')
  //     .sort({ createdAt: -1 })
  //     .lean()
  //     .exec();
  // }

  async findAllWithFilter(
    search?: string,
    sortWinRate?: 'asc' | 'desc',
    status?: HorseStatusEnum,
    sortTotalWin?: 'asc' | 'desc',
  ): Promise<Horse[]> {
    const filter: any = {};

    if (search) {
      filter.name = { $regex: search, $options: 'i' }; // Tìm kiếm không phân biệt hoa thường
    }

    if (status) {
      filter.horseStatus = status;
    }

    const sort: any = {};
    if (sortWinRate) {
      sort.winRate = sortWinRate === 'asc' ? 1 : -1;
    }
    if (sortTotalWin) {
      sort.totalWin = sortTotalWin === 'asc' ? 1 : -1;
    }

    // Nếu không truyền sortWinRate lẫn sortTotalWin thì mới fallback về createdAt
    if (!sortWinRate && !sortTotalWin) {
      sort.createdAt = -1;
    }

    return await this.horseModel
      .find(filter)
      .populate('userId')
      .sort(sort)
      .lean()
      .exec();
  }

  async findAllMyHorse(userId: string): Promise<Horse[]> {
    return await this.horseModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId')
      .sort({ createdAt: -1 })
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

  async incrementHorseRaceStats(
    horseId: string,
    isWinner: boolean,
    session?: ClientSession,
  ): Promise<Horse | null> {
    return await this.horseModel
      .findByIdAndUpdate(
        horseId,
        [
          {
            $set: {
              totalRace: { $add: [{ $ifNull: ['$totalRace', 0] }, 1] },
              totalWin: {
                $add: [{ $ifNull: ['$totalWin', 0] }, isWinner ? 1 : 0],
              },
            },
          },
          {
            $set: {
              // Horse.winRate lưu thang 0–100
              winRate: {
                $multiply: [{ $divide: ['$totalWin', '$totalRace'] }, 100],
              },
            },
          },
        ],
        { returnDocument: 'after', session, updatePipeline: true },
      )
      .lean()
      .exec();
  }

  async getHorseStats(): Promise<
    {
      total: { count: number }[];
      byStatus: { _id: string; count: number }[];
    }[]
  > {
    return await (this.horseModel
      .aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            byStatus: [{ $group: { _id: '$horseStatus', count: { $sum: 1 } } }],
          },
        },
      ])
      .exec() as Promise<
      {
        total: { count: number }[];
        byStatus: { _id: string; count: number }[];
      }[]
    >);
  }
}
