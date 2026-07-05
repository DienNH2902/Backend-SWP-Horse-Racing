// src/bet/bet.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Bet, BetDocument } from './schemas/bet.schema';
import { BetResultEnum } from 'src/constants/betResultStatusEnum.enum';

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
    return (await this.betModel
      .find()
      .populate([
        {
          path: 'spectatorId',
          model: 'SpectatorProfile', // Ép định danh chính xác Model của bảng phụ trong DB
          populate: {
            path: 'userId',
            model: 'User', // Đảm bảo khớp với Class User đã khai báo
            select: 'fullName email avatar',
          },
        },
        {
          path: 'raceId',
          select: 'name title', // Thay thế bằng các trường lưu tên trận đấu trong DB của bạn
        },
        {
          path: 'horseId',
          select: 'name', // Chỉ lấy trường name của ngựa
        },
      ])
      .sort({ createdAt: -1 })
      .lean()
      .exec()) as unknown as BetDocument[];
  }

  async findAllMyBets(userId: string): Promise<BetDocument[] | null> {
    return await this.betModel
      .find({ spectatorId: new Types.ObjectId(userId) })
      .populate([
        {
          path: 'spectatorId',
          model: 'SpectatorProfile', // Ép định danh chính xác Model của bảng phụ trong DB
          populate: {
            path: 'userId',
            model: 'User', // Đảm bảo khớp với Class User đã khai báo
            select: 'fullName email avatar',
          },
        },
        {
          path: 'raceId',
          select: 'name title', // Thay thế bằng các trường lưu tên trận đấu trong DB của bạn
        },
        {
          path: 'horseId',
          select: 'name', // Chỉ lấy trường name của ngựa
        },
      ])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findById(id: string): Promise<BetDocument | null> {
    return this.betModel
      .findById(new Types.ObjectId(id))
      .populate([
        {
          path: 'spectatorId',
          model: 'SpectatorProfile', // Ép định danh chính xác Model của bảng phụ trong DB
          populate: {
            path: 'userId',
            model: 'User', // Đảm bảo khớp với Class User đã khai báo
            select: 'fullName email avatar',
          },
        },
        {
          path: 'raceId',
          select: 'name title', // Thay thế bằng các trường lưu tên trận đấu trong DB của bạn
        },
        {
          path: 'horseId',
          select: 'name', // Chỉ lấy trường name của ngựa
        },
      ])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
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

  //Lấy tất cả bet nhưng không có trạng thái là refunded vì tránh cập nhật trạng thái lose cho refunded
  async findAllPendingBetsByRaceId(raceId: string): Promise<BetDocument[]> {
    return this.betModel
      .find({
        raceId: new Types.ObjectId(raceId),
        result: { $ne: BetResultEnum.REFUNDED },
      })
      .exec();
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
        { returnDocument: 'after', session },
      )
      .populate([
        {
          path: 'spectatorId',
          model: 'SpectatorProfile', // Ép định danh chính xác Model của bảng phụ trong DB
          populate: {
            path: 'userId',
            model: 'User', // Đảm bảo khớp với Class User đã khai báo
            select: 'fullName email avatar',
          },
        },
        {
          path: 'raceId',
          select: 'name title', // Thay thế bằng các trường lưu tên trận đấu trong DB của bạn
        },
        {
          path: 'horseId',
          select: 'name', // Chỉ lấy trường name của ngựa
        },
      ])
      .exec();
  }

  async findPendingBetsByRaceAndHorse(
    raceId: string,
    horseId: string,
  ): Promise<any[]> {
    return this.betModel
      .find({
        raceId: new Types.ObjectId(raceId),
        horseId: new Types.ObjectId(horseId),
        result: BetResultEnum.PENDING,
      })
      .exec();
  }

  async updateBetResult(betId: string, result: BetResultEnum): Promise<any> {
    return this.betModel.findByIdAndUpdate(
      betId,
      { $set: { result } },
      { returnDocument: 'after' },
    );
  }
}
