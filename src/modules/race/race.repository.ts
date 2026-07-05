import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
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
    return (await this.raceModel.insertMany(data)) as unknown as Race[];
  }

  async create(data: Partial<Race>): Promise<Race> {
    return (await new this.raceModel(data).save()) as unknown as Race;
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
      .findByIdAndUpdate(new Types.ObjectId(raceId), {
        status,
        ...(status === RaceStatusEnum.SIMULATED && { simulatedAt: new Date() }),
        ...(status === RaceStatusEnum.READY && {
          refereeConfirmedAt: new Date(),
        }),
      })
      .exec();
  }

  async assignRaceCourse(
    raceId: string,
    raceCourseId: string,
  ): Promise<Race | null> {
    return this.raceModel
      .findByIdAndUpdate(
        raceId,
        { $set: { raceCourseId: new Types.ObjectId(raceCourseId) } },
        { returnDocument: 'after' },
      )
      .populate('tournamentId refereeId raceCourseId')
      .lean()
      .exec() as Promise<Race | null>;
  }

  async findFinishedBefore(date: Date): Promise<Race[]> {
    return this.raceModel
      .find({
        status: RaceStatusEnum.FINISHED,
        updatedAt: { $lt: date },
      })
      .select('_id')
      .lean()
      .exec() as Promise<Race[]>;
  }

  async findByTournamentAndStatus(
    tournamentId: string,
    status?: RaceStatusEnum,
  ): Promise<Race[]> {
    const filter: any = {
      tournamentId: new Types.ObjectId(tournamentId),
    };
    if (status) filter.status = status;

    return this.raceModel
      .find(filter)
      .populate('tournamentId refereeId raceCourseId')
      .sort({ raceOrder: 1 })
      .lean()
      .exec() as Promise<Race[]>;
  }

  async findOneRace(filter: Record<string, any>): Promise<Race | null> {
    return this.raceModel
      .findOne(filter)
      .populate('tournamentId refereeId raceCourseId')
      .lean()
      .exec() as Promise<Race | null>;
  }

  async tryTransitionStatus(
    raceId: string,
    fromStatus: RaceStatusEnum,
    toStatus: RaceStatusEnum,
    session?: ClientSession,
  ): Promise<Race | null> {
    return this.raceModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(raceId), status: fromStatus },
        {
          $set: {
            status: toStatus,
            ...(toStatus === RaceStatusEnum.FINISHED && {
              finishedAt: new Date(),
            }),
          },
        },
        { returnDocument: 'after', session },
      )
      .lean()
      .exec();
  }

  async findUpcomingRaces(): Promise<RaceDocument[]> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return this.raceModel
      .find({ date: { $gte: now } })
      .populate('tournamentId', 'name')
      .populate('raceCourseId', 'name')
      .sort({ date: 1, startTime: 1 })
      .lean()
      .exec();
  }

  async findUpcomingRacesByReferee(refereeId: string): Promise<RaceDocument[]> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return this.raceModel
      .find({
        refereeId: new Types.ObjectId(refereeId),
        date: { $gte: now },
      })
      .populate('tournamentId', 'name')
      .populate('raceCourseId', 'name')
      .sort({ date: 1, startTime: 1 })
      .lean()
      .exec();
  }

  async findUpcomingRacesByIds(
    raceIds: Types.ObjectId[],
  ): Promise<RaceDocument[]> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return this.raceModel
      .find({
        _id: { $in: raceIds },
        date: { $gte: now },
      })
      .populate('tournamentId', 'name')
      .populate('raceCourseId', 'name')
      .sort({ date: 1, startTime: 1 })
      .lean()
      .exec();
  }
}
