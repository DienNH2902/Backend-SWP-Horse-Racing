import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserTournament } from './schemas/user-tournament.schema';

@Injectable()
export class UserTournamentRepository {
  constructor(
    @InjectModel(UserTournament.name) private model: Model<UserTournament>,
  ) {}

  // 1. User đăng ký tham gia giải đấu
  async joinTournament(userId: string, tournamentId: string) {
    return new this.model({
      userId: new Types.ObjectId(userId),
      tournamentId: new Types.ObjectId(tournamentId),
    }).save();
  }

  // 2. Tìm tất cả giải đấu mà 1 User đã tham gia
  async findTournamentsByUser(userId: string) {
    return await this.model
      .find({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'tournamentId',
        select: '-__v', // Kéo đầy đủ thông tin giải đấu lên
      })
      .lean()
      .exec();
  }

  // 3. Tìm tất cả User tham gia của giải đấu đó
  async findUsersByTournament(tournamentId: string) {
    return await this.model
      .find({ tournamentId: new Types.ObjectId(tournamentId) })
      .populate({
        path: 'userId',
        select: '_id fullName email phoneNumber avatar role', // Chỉ lấy các trường cần thiết
      })
      .lean()
      .exec();
  }
}
