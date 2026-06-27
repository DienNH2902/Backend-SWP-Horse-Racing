import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Streak, StreakDocument } from './schemas/streak.schema';
import { SpectatorProfile } from '../user/schemas/spectator-profile.schema';

@Injectable()
export class StreakRepository {
  constructor(
    @InjectModel(Streak.name)
    private readonly streakModel: Model<StreakDocument>,
    @InjectModel(SpectatorProfile.name)
    private readonly spectatorProfileModel: Model<SpectatorProfile>,
  ) {}

  async findByUserId(userId: string): Promise<StreakDocument | null> {
    return await this.streakModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async createStreak(streakData: Partial<Streak>): Promise<StreakDocument> {
    return await new this.streakModel(streakData).save();
  }

  async updateStreak(
    userId: string,
    updateData: Partial<Streak>,
  ): Promise<StreakDocument | null> {
    return await this.streakModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: updateData },
        {
          returnDocument: 'after',
          upsert: true, // Nếu không tìm thấy userId, tự động insert bản ghi mới dựa trên query và set dữ liệu
        },
      )
      .exec();
  }

  // Cộng 10 điểm vào cả số dư cược và tổng điểm tích lũy trọn đời của Spectator
  async rewardDailyPoints(userId: string, points: number = 10): Promise<void> {
    await this.spectatorProfileModel
      .updateOne(
        { userId: new Types.ObjectId(userId) },
        {
          $inc: {
            pointBalance: points,
            totalPoints: points,
          },
        },
      )
      .exec();
  }
}
