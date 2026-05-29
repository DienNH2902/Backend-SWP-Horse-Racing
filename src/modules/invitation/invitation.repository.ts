import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, UpdateQuery } from 'mongoose';
import {
  JockeyInvitation,
  JockeyInvitationDocument,
  InvitationStatusEnum,
} from './schemas/invitation.schema';

@Injectable()
export class JockeyInvitationRepository {
  constructor(
    @InjectModel(JockeyInvitation.name)
    private readonly model: Model<JockeyInvitationDocument>,
  ) {}

  async create(data: Partial<JockeyInvitation>): Promise<JockeyInvitation> {
    return new this.model(data).save();
  }

  async findById(id: string): Promise<JockeyInvitation | null> {
    return this.model
      .findById(id)
      .populate('tournamentId horseId jockeyId horseOwnerId')
      .lean()
      .exec();
  }

  /**
   * Tất cả invitation gửi đến jockey này (để jockey xem)
   */
  async findByJockeyId(jockeyId: string): Promise<JockeyInvitation[]> {
    return this.model
      .find({ jockeyId: new Types.ObjectId(jockeyId) })
      .populate('tournamentId horseId horseOwnerId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Tất cả invitation do horseOwner này gửi đi (để owner quản lý)
   */
  async findByHorseOwnerId(horseOwnerId: string): Promise<JockeyInvitation[]> {
    return this.model
      .find({ horseOwnerId: new Types.ObjectId(horseOwnerId) })
      .populate('tournamentId horseId jockeyId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Kiểm tra có PENDING nào tồn tại không (cho unique constraint check ở app layer)
   */
  async findPending(
    tournamentId: string,
    horseId: string,
    jockeyId: string,
  ): Promise<JockeyInvitation | null> {
    return this.model
      .findOne({
        tournamentId: new Types.ObjectId(tournamentId),
        horseId: new Types.ObjectId(horseId),
        jockeyId: new Types.ObjectId(jockeyId),
        status: InvitationStatusEnum.PENDING,
      })
      .lean()
      .exec();
  }

  async updateById(
    id: string,
    update: UpdateQuery<JockeyInvitation>,
  ): Promise<JockeyInvitation | null> {
    return this.model
      .findByIdAndUpdate(id, update, { returnDocument: 'after' })
      .lean()
      .exec();
  }

  /**
   * Dùng cho cron job expire invitation quá hạn
   */
  async expireOlderThan(date: Date): Promise<number> {
    const result = await this.model.updateMany(
      {
        status: InvitationStatusEnum.PENDING,
        createdAt: { $lt: date },
      },
      { $set: { status: InvitationStatusEnum.EXPIRED } },
    );
    return result.modifiedCount;
  }
}