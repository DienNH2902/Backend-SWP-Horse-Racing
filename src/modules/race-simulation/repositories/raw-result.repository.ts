import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RawResult, RawResultStatus } from '../schemas/raw-result.schema';

export interface CreateRawResultDto {
  raceId: Types.ObjectId;
  horseId: Types.ObjectId;
  jockeyId: Types.ObjectId;
  rawRank: number;
  finalRank: number;
  status: RawResultStatus.PENDING;
  finishedTime: Date;
}

@Injectable()
export class RawResultRepository {
  constructor(
    @InjectModel(RawResult.name)
    private readonly rawResultModel: Model<RawResult>,
  ) {}

  async bulkInsert(results: CreateRawResultDto[]): Promise<void> {
    await this.rawResultModel.insertMany(results, { ordered: false });
  }

  async findByRaceId(raceId: string): Promise<RawResult[]> {
    return await this.rawResultModel
      .find({ raceId: new Types.ObjectId(raceId) })
      .sort({ rawRank: 1 })
      .lean()
      .exec();
  }

  async findByRaceIdAndRank(
    raceId: string,
    finalRank: number,
  ): Promise<RawResult | null> {
    return await this.rawResultModel
      .findOne({
        raceId: new Types.ObjectId(raceId),
        finalRank,
        status: RawResultStatus.CONFIRMED,
      })
      .lean()
      .exec();
  }

  async updateFinalRank(
    raceId: string,
    horseId: string,
    finalRank: number,
  ): Promise<void> {
    await this.rawResultModel
      .findOneAndUpdate(
        {
          raceId: new Types.ObjectId(raceId),
          horseId: new Types.ObjectId(horseId),
        },
        { finalRank },
      )
      .exec();
  }

  async confirmAll(raceId: string): Promise<void> {
    await this.rawResultModel
      .updateMany(
        { raceId: new Types.ObjectId(raceId) },
        { status: RawResultStatus.CONFIRMED },
      )
      .exec();
  }
}