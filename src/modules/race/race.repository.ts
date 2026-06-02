// race.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Race, RaceDocument } from './schemas/race.schema';
import { RaceStatusEnum } from '../../constants/raceStatus.enum';

// Interface tạm để nhận dữ liệu từ Service mà không cần dùng Types.ObjectId ở Service
export interface CreateRaceItemDto {
  name: string;
  startTime: string | Date;
  date: string | Date;
}

@Injectable()
export class RaceRepository {
  constructor(
    @InjectModel(Race.name)
    private readonly raceModel: Model<RaceDocument>,
  ) {}

  async createMany(data: Partial<Race>[]): Promise<Race[]> {
    return this.raceModel.insertMany(data) as unknown as Race[];
  }

  async create(data: Partial<Race>): Promise<Race> {
    return new this.raceModel(data).save() as unknown as Race;
  }

  /**
   * Đóng gói logic tạo batch: tự động tính maxOrder và chuyển đổi ObjectId
   */
  async createBatch(tournamentId: string, racesData: CreateRaceItemDto[]): Promise<Race[]> {
    const maxOrder = await this.getMaxRaceOrder(tournamentId);
    
    const toInsert = racesData.map((item, index) => ({
      tournamentId: new Types.ObjectId(tournamentId),
      name: item.name,
      roundNumber: 1,
      raceOrder: maxOrder + index + 1,
      startTime: new Date(item.startTime),
      date: new Date(item.date),
      refereeId: null,
      raceCourseId: null,
      totalBettors: 0,
      status: RaceStatusEnum.SCHEDULED,
    }));

    return this.raceModel.insertMany(toInsert) as unknown as Race[];
  }

  /**
   * Đóng gói logic tạo race vòng 2 (Chung kết)
   */
  async createRound2Race(
    tournamentId: string, 
    tournamentTitle: string, 
    startTime: Date, 
    date: Date
  ): Promise<Race> {
    const maxOrder = await this.getMaxRaceOrder(tournamentId);
    
    const data = {
      tournamentId: new Types.ObjectId(tournamentId),
      name: `Chung kết - ${tournamentTitle}`,
      roundNumber: 2,
      raceOrder: maxOrder + 1,
      startTime,
      date,
      refereeId: null,
      raceCourseId: null,
      totalBettors: 0,
      status: RaceStatusEnum.SCHEDULED,
    };

    return new this.raceModel(data).save() as unknown as Race;
  }

  async findById(id: string): Promise<Race | null> {
    return this.raceModel
      .findById(id)
      .populate('tournamentId refereeId raceCourseId')
      .lean()
      .exec() as Promise<Race | null>;
  }

  async findByTournament(tournamentId: string): Promise<Race[]> {
    return this.raceModel
      .find({ tournamentId: new Types.ObjectId(tournamentId) })
      .populate('tournamentId refereeId raceCourseId')
      .sort({ raceOrder: 1 })
      .lean()
      .exec() as Promise<Race[]>;
  }

  async findByTournamentAndRound(
    tournamentId: string,
    roundNumber: number,
  ): Promise<Race[]> {
    return this.raceModel
      .find({
        tournamentId: new Types.ObjectId(tournamentId),
        roundNumber,
      })
      .sort({ raceOrder: 1 })
      .lean()
      .exec() as Promise<Race[]>;
  }

  async countByTournament(tournamentId: string): Promise<number> {
    return this.raceModel.countDocuments({
      tournamentId: new Types.ObjectId(tournamentId),
    });
  }

  async countByTournamentAndRound(
    tournamentId: string,
    roundNumber: number,
  ): Promise<number> {
    return this.raceModel.countDocuments({
      tournamentId: new Types.ObjectId(tournamentId),
      roundNumber,
    });
  }

  async getMaxRaceOrder(tournamentId: string): Promise<number> {
    const last = await this.raceModel
      .findOne({ tournamentId: new Types.ObjectId(tournamentId) })
      .sort({ raceOrder: -1 })
      .lean()
      .exec();
    return last?.raceOrder ?? 0;
  }
}