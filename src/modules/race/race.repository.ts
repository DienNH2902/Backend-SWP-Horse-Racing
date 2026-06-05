import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Race, RaceDocument } from './schemas/race.schema';
import { RaceStatusEnum } from '../../constants/raceStatus.enum';

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

  async createBatch(
    tournamentId: string,
    racesData: CreateRaceItemDto[],
  ): Promise<Race[]> {
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

  async createRound2Race(
    tournamentId: string,
    tournamentTitle: string,
    startTime: Date,
    date: Date,
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
      .find({ tournamentId: new Types.ObjectId(tournamentId), roundNumber })
      .sort({ raceOrder: 1 })
      .lean()
      .exec() as Promise<Race[]>;
  }

  async countByTournament(tournamentId: string): Promise<number> {
    return this.raceModel.countDocuments({
      tournamentId: new Types.ObjectId(tournamentId),
    });
  }

  /**
   * Đếm riêng theo round — dùng để validate totalRaces chính xác
   * tránh bị lệch bởi race vòng 2
   */
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

  async allRound1Finished(tournamentId: string): Promise<boolean> {
    const unfinished = await this.raceModel.countDocuments({
      tournamentId: new Types.ObjectId(tournamentId),
      roundNumber: 1,
      status: { $ne: RaceStatusEnum.FINISHED },
    });
    return unfinished === 0;
  }

  /**
   * Tìm race của referee bị conflict lịch (~2h buffer)
   */
  async findConflictingRacesForReferee(
    refereeId: string,
    newRaceStart: Date,
    excludeRaceId?: string,
  ): Promise<Race[]> {
    const bufferMs = 2 * 60 * 60 * 1000;
    const newRaceEnd = new Date(newRaceStart.getTime() + bufferMs);

    const filter: any = {
      refereeId: new Types.ObjectId(refereeId),
      status: { $nin: [RaceStatusEnum.FINISHED, RaceStatusEnum.CANCELLED] },
      startTime: { $lt: newRaceEnd },
      $expr: {
        $gt: [{ $add: ['$startTime', bufferMs] }, newRaceStart],
      },
    };

    if (excludeRaceId) {
      filter._id = { $ne: new Types.ObjectId(excludeRaceId) };
    }

    return this.raceModel
      .find(filter)
      .select('name startTime tournamentId')
      .lean()
      .exec() as Promise<Race[]>;
  }

  async assignReferee(raceId: string, refereeId: string): Promise<Race | null> {
    return this.raceModel
      .findByIdAndUpdate(
        raceId,
        { $set: { refereeId: new Types.ObjectId(refereeId) } },
        { returnDocument: 'after' },
      )
      .populate('tournamentId refereeId')
      .lean()
      .exec() as Promise<Race | null>;
  }

  async updateById(id: string, update: Partial<Race>): Promise<Race | null> {
    return this.raceModel
      .findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after' })
      .lean()
      .exec() as Promise<Race | null>;
  }

  async findByReferee(refereeId: string): Promise<Race[]> {
    return this.raceModel
      .find({ refereeId: new Types.ObjectId(refereeId) })
      .populate('tournamentId raceCourseId')
      .sort({ date: 1, startTime: 1 })
      .lean()
      .exec() as Promise<Race[]>;
  }

 
async updateStatus(raceId: string, status: RaceStatusEnum): Promise<void> {
  await this.raceModel
    .findByIdAndUpdate(
      new Types.ObjectId(raceId),
      {
        status,
        ...(status === RaceStatusEnum.SIMULATED && { simulatedAt: new Date() }),
      },
    )
    .exec();
}
}