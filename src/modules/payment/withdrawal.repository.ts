import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, QueryFilter, Types } from 'mongoose';
import {
  WithdrawalRequest,
  WithdrawalRequestDocument,
} from './schemas/withdrawal.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { WithdrawalStatusEnum } from 'src/constants/withdrawalStatusEnum.enum';

@Injectable()
export class WithdrawalRepository {
  constructor(
    @InjectModel(WithdrawalRequest.name)
    private readonly withdrawalModel: Model<WithdrawalRequestDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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

  // async findAllRequests(): Promise<WithdrawalRequestDocument[]> {
  //   return this.withdrawalModel
  //     .find()
  //     .select('-__v')
  //     .populate('userId', 'fullName email role')
  //     .sort({ createdAt: -1 })
  //     .lean()
  //     .exec();
  // }

  async findAllRequests(
    status?: WithdrawalStatusEnum,
    search?: string,
  ): Promise<WithdrawalRequestDocument[]> {
    const filter: QueryFilter<WithdrawalRequestDocument> = {};

    // Filter theo status nếu có
    if (status) {
      filter.status = status;
    }

    // Search theo fullName nếu có
    if (search && search.trim()) {
      const keyword = search.trim();

      // Tìm danh sách userId có fullName chứa từ khóa search
      const matchingUsers = await this.userModel
        .find({ fullName: { $regex: keyword, $options: 'i' } })
        .select('_id')
        .lean()
        .exec();

      const matchedUserIds = matchingUsers.map((user) => user._id);

      // Thêm điều kiện $in vào filter
      filter.userId = { $in: matchedUserIds };
    }

    return this.withdrawalModel
      .find(filter)
      .select('-__v')
      .populate('userId', 'fullName email role')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
}
