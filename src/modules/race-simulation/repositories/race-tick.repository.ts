import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RaceTick } from '../schemas/race-tick.schema';

export interface CreateRaceTickDto {
  raceId: Types.ObjectId;
  horseId: Types.ObjectId;
  tickNumber: number;
  progress: number;
  currentSpeed: number;
  lane: number;
}

@Injectable()
export class RaceTickRepository {
  constructor(
    @InjectModel(RaceTick.name)
    private readonly raceTickModel: Model<RaceTick>,
  ) {}

  async bulkInsert(ticks: CreateRaceTickDto[]): Promise<void> {
    // Chia batch 1000 để tránh MongoDB document limit
    const BATCH_SIZE = 1000;
    for (let i = 0; i < ticks.length; i += BATCH_SIZE) {
      await this.raceTickModel.insertMany(ticks.slice(i, i + BATCH_SIZE), {
        ordered: false,
      });
    }
  }

  // Dùng cho Phase 4 — Broadcast: lấy tất cả tick của race theo thứ tự
  async findByRaceIdOrdered(raceId: string): Promise<RaceTick[]> {
    return await this.raceTickModel
      .find({ raceId: new Types.ObjectId(raceId) })
      .sort({ tickNumber: 1, horseId: 1 })
      .lean()
      .exec();
  }

  // Lấy max tickNumber của một race (dùng khi build progressMap)
  async findMaxTick(raceId: Types.ObjectId): Promise<number> {
    const result = await this.raceTickModel
      .findOne({ raceId })
      .sort({ tickNumber: -1 })
      .select('tickNumber')
      .lean()
      .exec();
    return result ? result.tickNumber : 0;
  }

  // Xóa toàn bộ tick sau khi race kết thúc (Phase 5)
  async deleteByRaceId(raceId: string): Promise<void> {
    await this.raceTickModel
      .deleteMany({ raceId: new Types.ObjectId(raceId) })
      .exec();
  }
}