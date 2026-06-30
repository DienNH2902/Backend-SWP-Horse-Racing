// src/bet/bet.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Bet, BetDocument } from './schemas/bet.schema';

@Injectable()
export class BetRepository {
  constructor(
    @InjectModel(Bet.name) private readonly betModel: Model<BetDocument>,
  ) {}

  async create(
    data: Partial<Bet>,
    session?: ClientSession,
  ): Promise<BetDocument> {
    const bet = new this.betModel(data);
    return bet.save({ session });
  }

  async findAllBets(): Promise<BetDocument[] | null> {
    return await this.betModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  async findAllMyBets(userId: string): Promise<BetDocument[] | null> {
    return await this.betModel
      .find({ spectatorId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findById(id: string): Promise<BetDocument | null> {
    return this.betModel.findById(new Types.ObjectId(id)).exec();
  }

  async findBySpectatorAndRace(
    spectatorId: string,
    raceId: string,
  ): Promise<BetDocument | null> {
    return this.betModel
      .findOne({
        spectatorId: new Types.ObjectId(spectatorId),
        raceId: new Types.ObjectId(raceId),
      })
      .exec();
  }

  async findByRaceId(raceId: string): Promise<BetDocument[]> {
    return this.betModel.find({ raceId: new Types.ObjectId(raceId) }).exec();
  }

  async countBettorsOnHorse(raceId: string, horseId: string): Promise<number> {
    return this.betModel
      .countDocuments({
        raceId: new Types.ObjectId(raceId),
        horseId: new Types.ObjectId(horseId),
      })
      .exec();
  }

  async countTotalBettorsInRace(raceId: string): Promise<number> {
    return this.betModel
      .countDocuments({
        raceId: new Types.ObjectId(raceId),
      })
      .exec();
  }

  async updateBet(
    id: string,
    updateData: Partial<Bet>,
    session?: ClientSession,
  ): Promise<BetDocument | null> {
    return this.betModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: updateData },
        { new: true, session },
      )
      .exec();
  }
}
