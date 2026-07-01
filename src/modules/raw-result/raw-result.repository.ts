import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { RawResult, RawResultDocument } from './schemas/raw-result.schema';
import { RawResultStatus } from '../../constants/rawResultStatus.enum';

@Injectable()
export class RawResultRepository {
  constructor(
    @InjectModel(RawResult.name)
    private readonly rawResultModel: Model<RawResultDocument>,
  ) {}

  async findByRaceId(raceId: string): Promise<RawResult[]> {
    return this.rawResultModel
      .find({ raceId: new Types.ObjectId(raceId) })
      .lean()
      .exec();
  }

  async findWinnerByRaceId(raceId: string): Promise<RawResult | null> {
    return this.rawResultModel
      .findOne({
        raceId: new Types.ObjectId(raceId),
        finalRank: 1,
        status: RawResultStatus.CONFIRMED,
      })
      .lean()
      .exec();
  }

  async findByRaceIdSortedByRawRank(raceId: string): Promise<RawResult[]> {
    return this.rawResultModel
      .find({ raceId: new Types.ObjectId(raceId) })
      .sort({ rawRank: 1 })
      .lean()
      .exec();
  }

  async bulkUpdateFinalRankAndStatus(
    updates: Array<{
      id: string;
      finalRank: number | null;
      status: RawResultStatus;
    }>,
    session?: ClientSession,
  ): Promise<void> {
    const ops = updates.map(({ id, finalRank, status }) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id) },
        update: { $set: { finalRank, status } as any },
      },
    }));
    await this.rawResultModel.bulkWrite(ops, { session });
  }
}
