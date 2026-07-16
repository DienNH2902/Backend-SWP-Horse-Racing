import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Prize, PrizeDocument } from '../prize-distribution/schemas/prize.schema';

@Injectable()
export class PrizeRepository {
  constructor(
    @InjectModel(Prize.name)
    private readonly prizeModel: Model<PrizeDocument>,
  ) {}

  async create(data: Partial<Prize>): Promise<Prize> {
    return new this.prizeModel(data).save();
  }

  async findById(id: string): Promise<Prize | null> {
    return this.prizeModel.findById(id).lean().exec();
  }

  async findByTournamentId(tournamentId: string): Promise<Prize | null> {
    return this.prizeModel
      .findOne({ tournamentId: new Types.ObjectId(tournamentId) })
      .lean()
      .exec();
  }
  
  async findManyByTournamentIds(tournamentIds: string[]): Promise<Prize[]> {
    if (!tournamentIds.length) return [];
    return this.prizeModel
      .find({ tournamentId: { $in: tournamentIds.map(id => new Types.ObjectId(id)) } })
      .lean()
      .exec();
  }

}