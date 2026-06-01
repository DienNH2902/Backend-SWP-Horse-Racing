import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import {
  Registration,
  RegistrationDocument,
} from './schemas/registration.schema';
import { RegistrationStatusEnum } from 'src/constants/registrationStatus.enum';

//type FilterQuery<T> = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

@Injectable()
export class RegistrationRepository {
  constructor(
    @InjectModel(Registration.name)
    private readonly model: Model<RegistrationDocument>,
  ) {}

  async create(data: Partial<Registration>): Promise<Registration> {
    return new this.model(data).save();
  }

  async findById(id: string): Promise<Registration | null> {
    return this.model
      .findById(id)
      .populate('tournamentId horseId jockeyId ownerId jockeyInvitationId')
      .lean()
      .exec();
  }

  async findByOwnerId(
    ownerId: string,
    tournamentId?: string,
  ): Promise<Registration[]> {
    const filter: QueryFilter<Registration> = {
      ownerId: new Types.ObjectId(ownerId),
    };
    if (tournamentId) {
      filter.tournamentId = new Types.ObjectId(tournamentId);
    }
    return this.model
      .find(filter)
      .populate('tournamentId horseId jockeyId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findAll(
    filter: QueryFilter<Registration> = {},
  ): Promise<Registration[]> {
    return this.model
      .find(filter)
      .populate('tournamentId horseId jockeyId ownerId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findActiveByTournamentAndHorse(
    tournamentId: string,
    horseId: string,
  ): Promise<Registration | null> {
    return this.model
      .findOne({
        tournamentId: new Types.ObjectId(tournamentId),
        horseId: new Types.ObjectId(horseId),
        status: { $ne: RegistrationStatusEnum.REJECTED },
      })
      .lean()
      .exec();
  }

  async updateById(
    id: string,
    update: UpdateQuery<Registration>,
  ): Promise<Registration | null> {
    return this.model
      .findByIdAndUpdate(id, update, { returnDocument: 'after' })
      .populate('tournamentId horseId jockeyId ownerId')
      .lean()
      .exec();
  }

  async findConfirmedByRace(raceId: string): Promise<Registration[]> {
    return this.model
      .find({
        tournamentId: new Types.ObjectId(raceId),
        status: RegistrationStatusEnum.CONFIRMED,
      })
      .populate('horseId jockeyId ownerId')
      .lean()
      .exec();
  }
}
