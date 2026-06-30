import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  WithdrawalRequest,
  WithdrawalRequestDocument,
} from './schemas/withdrawal.schema';

@Injectable()
export class WithdrawalRepository {
  constructor(
    @InjectModel(WithdrawalRequest.name)
    private readonly withdrawalModel: Model<WithdrawalRequestDocument>,
  ) {}

  async create(
    data: any,
    session?: ClientSession,
  ): Promise<WithdrawalRequestDocument> {
    const created = new this.withdrawalModel(data);
    return created.save({ session });
  }

  async findAllMyRequest(
    id: string,
  ): Promise<WithdrawalRequestDocument[] | null> {
    return this.withdrawalModel
      .find({ userId: new Types.ObjectId(id) })
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findById(id: string): Promise<WithdrawalRequestDocument | null> {
    return this.withdrawalModel.findById(id).select('-__v').exec();
  }

  // Admin xem thông tin đầy đủ của request kèm thông tin User (fullName, email, role)
  async findByIdWithUserDetails(id: string): Promise<any> {
    return this.withdrawalModel
      .findById(id)
      .select('-__v')
      .populate('userId', 'fullName email role')
      .lean()
      .exec();
  }

  async findAllRequests(): Promise<WithdrawalRequestDocument[]> {
    return this.withdrawalModel
      .find()
      .select('-__v')
      .populate('userId', 'fullName email role')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
}
