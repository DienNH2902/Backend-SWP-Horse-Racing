import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tournament, TournamentDocument } from './schemas/tournament.schema';

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

  async findAllTournament(): Promise<TournamentDocument[]> {
    return await this.tournamentModel.find().sort({ startDate: 1 }).exec();
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
}
