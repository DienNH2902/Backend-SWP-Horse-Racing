import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ContractBreach,
  ContractBreachDocument,
} from './schemas/contractBreach.schema';

@Injectable()
export class ContractBreachRepository {
  constructor(
    @InjectModel(ContractBreach.name)
    private readonly breachModel: Model<ContractBreachDocument>,
  ) {}

  async create(data: Partial<ContractBreach>): Promise<ContractBreach> {
    return new this.breachModel(data).save();
  }

  // Tìm các vi phạm của một user cụ thể (chủ ngựa hoặc nài ngựa) trong giải đấu
  async findBreachesByUser(userId: string): Promise<ContractBreach[]> {
    return this.breachModel
      .find()
      .populate({
        path: 'contractId',
        match: {
          $or: [
            { horseOwnerId: new Types.ObjectId(userId) },
            { jockeyId: new Types.ObjectId(userId) },
          ],
        },
      })
      .lean()
      .exec()
      .then((breaches) => breaches.filter((b) => b.contractId !== null));
  }
}
