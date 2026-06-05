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
    private readonly registrationModel: Model<RegistrationDocument>,
  ) {}

  async create(data: Partial<Registration>): Promise<Registration> {
    return new this.registrationModel(data).save();
  }

  async findById(id: string): Promise<Registration | null> {
    return this.registrationModel
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
    return this.registrationModel
      .find(filter)
      .populate('tournamentId horseId jockeyId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findAll(filter: QueryFilter<Registration>): Promise<Registration[]> {
    return this.registrationModel
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
    return this.registrationModel
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
    return this.registrationModel
      .findByIdAndUpdate(id, update, { returnDocument: 'after' })
      .populate('tournamentId horseId jockeyId ownerId')
      .lean()
      .exec();
  }

  async findConfirmedByRace(raceId: string): Promise<Registration[]> {
    return this.registrationModel
      .find({
        tournamentId: new Types.ObjectId(raceId),
        status: RegistrationStatusEnum.CONFIRMED,
      })
      .populate('horseId jockeyId ownerId')
      .lean()
      .exec();
  }

  async updateStatusToWaitlisted(id: string): Promise<Registration | null> {
    return this.registrationModel
      .findByIdAndUpdate(
        id,
        { $set: { status: RegistrationStatusEnum.WAITLISTED } },
        { returnDocument: 'after' },
      )
      .populate('tournamentId horseId jockeyId ownerId')
      .lean()
      .exec();
  }

  async updateStatusToConfirmed(
    id: string,
    gateNumber: number,
  ): Promise<Registration | null> {
    return this.registrationModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: RegistrationStatusEnum.CONFIRMED,
            gateNumber: gateNumber,
            confirmedAt: new Date(),
          },
        },
        { returnDocument: 'after' },
      )
      .populate('tournamentId horseId jockeyId ownerId')
      .lean()
      .exec();
  }

  async updateStatusToRejected(
    id: string,
    reason: string,
  ): Promise<Registration | null> {
    return this.registrationModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: RegistrationStatusEnum.REJECTED,
            rejectedReason: reason,
            rejectedAt: new Date(),
          },
        },
        { returnDocument: 'after' },
      )
      .populate('tournamentId horseId jockeyId ownerId')
      .lean()
      .exec();
  }


  async countConfirmedByRace(raceId: string): Promise<number> {
  return this.registrationModel.countDocuments({
    raceId: new Types.ObjectId(raceId),
    status: RegistrationStatusEnum.CONFIRMED,
  });
}

async getUsedGateNumbers(raceId: string): Promise<number[]> {
  const docs = await this.registrationModel
    .find(
      { raceId: new Types.ObjectId(raceId), status: RegistrationStatusEnum.CONFIRMED },
      { gateNumber: 1 },
    )
    .lean()
    .exec();
  return docs.map((d) => d.gateNumber).filter(Boolean);
}

async bulkConfirmWithGate(
  items: Array<{ id: string; gateNumber: number; raceId: string }>,
): Promise<void> {
  const ops = items.map((item) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(item.id) },
      update: {
        $set: {
          status: RegistrationStatusEnum.CONFIRMED,
          raceId: new Types.ObjectId(item.raceId),
          gateNumber: item.gateNumber,
          confirmedAt: new Date(),
        },
      },
    },
  }));
  await this.registrationModel.bulkWrite(ops);
}
}
