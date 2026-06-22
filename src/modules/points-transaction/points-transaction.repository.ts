import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PointsTransaction,
  PointsTransactionDocument,
} from './schemas/pointsTransaction.schema';
import { CreatePointsTransactionDto } from './dto/create-points-transaction.dto';

@Injectable()
export class PointsTransactionRepository {
  constructor(
    @InjectModel(PointsTransaction.name)
    private readonly transactionModel: Model<PointsTransactionDocument>,
  ) {}

  async createTransaction(
    dto: CreatePointsTransactionDto,
  ): Promise<PointsTransactionDocument> {
    const newDoc = new this.transactionModel({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
      rewardId: dto.rewardId ? new Types.ObjectId(dto.rewardId) : undefined,
    });
    return await newDoc.save();
  }

  async findByUserId(userId: string): Promise<PointsTransactionDocument[]> {
    return await this.transactionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 }) // Giao dịch mới nhất lên đầu
      .exec();
  }
}
