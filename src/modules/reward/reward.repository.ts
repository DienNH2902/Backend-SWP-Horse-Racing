import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, QueryFilter, Types } from 'mongoose';
import { Reward, RewardDocument } from './schemas/reward.schema';
import { SpectatorProfile } from '../user/schemas/spectator-profile.schema'; // Cập nhật đường dẫn thực tế của bạn
import {
  ClaimedReward,
  ClaimedRewardDocument,
} from './schemas/claimedReward.schema';

@Injectable()
export class RewardRepository {
  constructor(
    @InjectModel(Reward.name)
    private readonly rewardModel: Model<RewardDocument>,
    @InjectModel(ClaimedReward.name)
    private readonly claimedRewardModel: Model<ClaimedRewardDocument>,
    @InjectModel(SpectatorProfile.name)
    private readonly spectatorProfileModel: Model<SpectatorProfile>,
  ) {}

  async createReward(rewardData: Partial<Reward>): Promise<RewardDocument> {
    const newReward = new this.rewardModel(rewardData);
    return await newReward.save();
  }

  async findAllRewards(): Promise<RewardDocument[]> {
    return await this.rewardModel.find().exec();
  }

  async findOneReward(filter: QueryFilter<Reward>): Promise<Reward | null> {
    return await this.rewardModel.findOne(filter).lean().exec();
  }

  async findRewardById(id: string): Promise<RewardDocument | null> {
    return await this.rewardModel.findById(new Types.ObjectId(id)).exec();
  }

  async updateReward(
    id: string,
    updateData: Partial<Reward>,
  ): Promise<RewardDocument | null> {
    return await this.rewardModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: updateData },
        { returnDocument: 'after' }, // Trả về tài liệu sau khi đã update thành công
      )
      .exec();
  }

  async findClaimedRecord(
    userId: string,
    rewardId: string,
  ): Promise<ClaimedRewardDocument | null> {
    return await this.claimedRewardModel
      .findOne({
        userId: new Types.ObjectId(userId),
        rewardId: new Types.ObjectId(rewardId),
      })
      .exec();
  }

  async findClaimsByUserId(userId: string): Promise<ClaimedRewardDocument[]> {
    return await this.claimedRewardModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('rewardId')
      .exec();
  }

  async createClaimRecord(
    userId: string,
    rewardId: string,
  ): Promise<ClaimedRewardDocument> {
    const newClaim = new this.claimedRewardModel({
      userId: new Types.ObjectId(userId),
      rewardId: new Types.ObjectId(rewardId),
    });
    return await newClaim.save();
  }

  async findSpectatorProfile(userId: string): Promise<SpectatorProfile | null> {
    return await this.spectatorProfileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  // Khấu trừ số dư đặt cược (Dành cho mua đồ trong SHOP)
  async deductPointBalance(userId: string, amount: number): Promise<void> {
    await this.spectatorProfileModel
      .updateOne(
        { userId: new Types.ObjectId(userId) },
        { $inc: { pointBalance: -amount } },
      )
      .exec();
  }

  // Cộng điểm thưởng (Dành cho quà MILESTONE / SHOP đặc biệt)
  async bonusPoints(userId: string, amount: number): Promise<void> {
    await this.spectatorProfileModel
      .updateOne(
        { userId: new Types.ObjectId(userId) },
        {
          $inc: {
            pointBalance: amount,
            totalPoints: amount,
          },
        },
      )
      .exec();
  }

  // Thêm vào file chứa các method tương tác DB của Reward/ClaimedReward
  async findUnusedInsuranceCard(userId: string): Promise<any> {
    return await this.claimedRewardModel
      .findOne({
        userId: new Types.ObjectId(userId),
        isUsed: false,
      })
      .populate('rewardId');
    // Chú ý: Đảm bảo điều kiện populate khớp với logic kiểm tra rewardType bên dưới
  }

  async useInsuranceCard(
    claimedRewardId: string,
    session: ClientSession,
  ): Promise<void> {
    await this.claimedRewardModel.findByIdAndUpdate(
      claimedRewardId,
      { $set: { isUsed: true } },
      { session },
    );
  }

  async deleteReward(id: string): Promise<Reward | null> {
    return this.rewardModel.findByIdAndDelete(id).exec();
  }
}
