import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HorseRaceStats } from '../schemas/horse-race-stat.schema';

export interface CreateHorseRaceStatsDto {
  raceId: Types.ObjectId;
  horseId: Types.ObjectId;
  jockeyId: Types.ObjectId;
  totalLoad: number;
  baseSpeed: number;
  acceleration: number;
  stamina: number;
  totalWin: number;
}

@Injectable()
export class HorseRaceStatsRepository {
  constructor(
    @InjectModel(HorseRaceStats.name)
    private readonly statsModel: Model<HorseRaceStats>,
  ) {}

  async bulkInsert(stats: CreateHorseRaceStatsDto[]): Promise<void> {
    await this.statsModel.insertMany(stats, { ordered: false });
  }

  async findByRaceId(raceId: string): Promise<HorseRaceStats[]> {
    return await this.statsModel
      .find({ raceId: new Types.ObjectId(raceId) })
      .lean()
      .exec();
  }
}