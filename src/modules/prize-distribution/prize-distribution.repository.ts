import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  PrizeDistribution,
  PrizeDistributionDocument,
  PrizeDistributionStatus,
} from './schemas/prize-distribution.schema';

@Injectable()
export class PrizeDistributionRepository {
  constructor(
    @InjectModel(PrizeDistribution.name)
    private readonly model: Model<PrizeDistributionDocument>,
  ) {}

  async create(
    data: Partial<PrizeDistribution>,
    session?: ClientSession,
  ): Promise<PrizeDistribution> {
    return new this.model(data).save({ session });
  }

  async findByRawResultId(
    rawResultId: string,
  ): Promise<PrizeDistribution | null> {
    return this.model
      .findOne({ rawResultId: new Types.ObjectId(rawResultId) })
      .lean()
      .exec();
  }

  async markDistributed(id: string, session?: ClientSession): Promise<void> {
    await this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: PrizeDistributionStatus.DISTRIBUTED,
            distributedAt: new Date(),
          },
        },
        { session },
      )
      .exec();
  }
}