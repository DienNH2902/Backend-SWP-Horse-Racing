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

  async findByHorseId(horseId: string): Promise<RawResult[]> {
  return this.rawResultModel
    .find({
      horseId: new Types.ObjectId(horseId),
      status: RawResultStatus.CONFIRMED,
    })
    .populate({
      path: 'raceId',
      select: 'name date tournamentId',
      populate: { path: 'tournamentId', select: 'title' },
    })
    .sort({ finishedTime: -1 })
    .lean()
    .exec();
}

async findByJockeyId(jockeyProfileId: string): Promise<RawResult[]> {
  return this.rawResultModel
    .find({
      jockeyId: new Types.ObjectId(jockeyProfileId),
      status: RawResultStatus.CONFIRMED,
    })
    .populate({
      path: 'raceId',
      select: 'name date tournamentId',
      populate: { path: 'tournamentId', select: 'title' },
    })
    .populate({
      path: 'jockeyId',
      select: 'userId',
      populate: { path: 'userId', select: 'fullName' },
    })
    .populate({
      path: 'horseId',
      select: 'name userId',
      populate: { path: 'userId', select: 'fullName' },
    })
    .sort({ finishedTime: -1 })
    .lean()
    .exec();
}

async findByHorseIds(horseIds: Types.ObjectId[]): Promise<RawResult[]> {
  if (!horseIds.length) return [];
  return this.rawResultModel
    .find({
      horseId: { $in: horseIds },
      status: RawResultStatus.CONFIRMED,
    })
    .populate({
      path: 'raceId',
      select: 'name date tournamentId',
      populate: { path: 'tournamentId', select: 'title' },
    })
    .populate({ path: 'horseId', select: 'name' })
    .populate({
      path: 'jockeyId',
      select: 'userId',
      populate: { path: 'userId', select: 'fullName' },
    })
    .sort({ finishedTime: -1 })
    .lean()
    .exec();
}

async findFinalResultsByRaceId(raceId: string): Promise<RawResult[]> {
  return this.rawResultModel
    .find({ raceId: new Types.ObjectId(raceId) })
    .populate({ path: 'raceId', select: 'name' })
    .populate({
      path: 'horseId',
      select: 'name userId',
      populate: { path: 'userId', select: 'fullName' }, // chủ ngựa (User)
    })
    .populate({
      path: 'jockeyId',
      select: 'userId',
      populate: { path: 'userId', select: 'fullName' }, // jockey (User)
    })
    .lean()
    .exec();
}

  async findByRaceIds(raceIds: Types.ObjectId[]): Promise<RawResult[]> {
    if (!raceIds.length) return [];
    return this.rawResultModel
      .find({
        raceId: { $in: raceIds },
        // status: RawResultStatus.CONFIRMED,
      })
      .populate({ path: 'horseId', select: 'name' })
      .populate({
        path: 'jockeyId',
        select: 'userId',
        populate: { path: 'userId', select: 'fullName' },
      })
      .sort({ finalRank: 1 })
      .lean()
      .exec();
  }
}
