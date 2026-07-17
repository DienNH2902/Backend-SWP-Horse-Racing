import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ContractBreach,
  ContractBreachDocument,
} from './schemas/contractBreach.schema';
import { BreachStatusEnum } from 'src/constants/breachStatusEnum.enum';

@Injectable()
export class ContractBreachRepository {
  constructor(
    @InjectModel(ContractBreach.name)
    private readonly breachModel: Model<ContractBreachDocument>,
  ) {}

  async create(data: Partial<ContractBreach>): Promise<ContractBreach> {
    return new this.breachModel(data).save();
  }

  async findById(breachId: string): Promise<ContractBreachDocument | null> {
    return this.breachModel.findById(breachId).exec();
  }

  async findByContractId(contractId: string): Promise<ContractBreach | null> {
    return await this.breachModel
      .findOne({ contractId: new Types.ObjectId(contractId) })
      .lean()
      .exec();
  }

  async updateStatus(
    breachId: string,
    status: BreachStatusEnum,
  ): Promise<ContractBreachDocument | null> {
    return this.breachModel
      .findByIdAndUpdate(
        breachId,
        { $set: { status, resolvedAt: new Date() } },
        { new: true },
      )
      .exec();
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
