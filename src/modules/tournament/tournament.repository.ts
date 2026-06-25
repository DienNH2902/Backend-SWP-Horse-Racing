import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Tournament, TournamentDocument } from './schemas/tournament.schema';
import { TournamentStatusEnum } from 'src/constants/tournamentStatusEnum.enum';

@Injectable()
export class TournamentRepository {
  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
  ) {}

  async createTournament(
    tournament: Partial<Tournament>,
  ): Promise<TournamentDocument> {
    return await new this.tournamentModel(tournament).save();
  }

  // async findAllTournament(): Promise<TournamentDocument[]> {
  //   return await this.tournamentModel.find().sort({ startDate: 1 }).exec();
  // }

  async findAllTournament(filter: {
    status?: TournamentStatusEnum;
  }): Promise<TournamentDocument[]> {
    const query: any = {};

    if (filter.status) {
      query.status = filter.status;
    }

    // Luôn giữ sắp xếp theo ngày bắt đầu tăng dần
    return await this.tournamentModel.find(query).sort({ startDate: 1 }).exec();
  }

  async findTournamentById(id: string): Promise<TournamentDocument | null> {
    return await this.tournamentModel.findById(id).exec();
  }

  async findById(id: string): Promise<Tournament | null> {
    return this.tournamentModel
      .findById(id)
      .lean()
      .exec() as Promise<Tournament | null>;
  }

  async findOverlappingTournament(
    startDate: Date,
    endDate: Date,
    excludeId?: string, // Dùng cho trường hợp update nếu cần
  ): Promise<TournamentDocument | null> {
    const query: any = {
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    };

    // Nếu là cập nhật giải đấu, loại trừ chính nó ra để không tự check trùng với mình
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    return await this.tournamentModel.findOne(query).exec();
  }

  async updateTournament(
    id: string,
    updateData: Partial<Tournament>,
  ): Promise<TournamentDocument | null> {
    return await this.tournamentModel
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .exec();
  }

  async deleteTournament(id: string): Promise<any> {
    return await this.tournamentModel.findByIdAndDelete(id).exec();
  }

    async updateTournamentWithSession(
    id: string,
    updateData: Partial<Tournament>,
    session?: ClientSession,
  ): Promise<TournamentDocument | null> {
    return await this.tournamentModel
      .findByIdAndUpdate(id, updateData, {
        returnDocument: 'after',
        session,
      })
      .exec();
  }
}
