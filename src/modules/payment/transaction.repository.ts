import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async create(data: Partial<Transaction>): Promise<Transaction> {
    return new this.transactionModel(data).save();
  }

  async createWithSession(
    data: Partial<Transaction>,
    session: ClientSession,
  ): Promise<Transaction> {
    return new this.transactionModel(data).save({ session });
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    return this.transactionModel
      .find({
        $or: [
          { senderId: new Types.ObjectId(userId) },
          { receiverId: new Types.ObjectId(userId) },
        ],
      })
      .populate('senderId receiverId', 'fullName email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactionModel
      .find()
      .populate('senderId receiverId', 'fullName email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async checkExistsByContent(content: string): Promise<boolean> {
    const exists = await this.transactionModel.exists({ content });
    return exists !== null;
  }
}
