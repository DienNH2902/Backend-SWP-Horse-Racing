import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contract, ContractDocument } from './schemas/contract.schema';
import { ContractStatusEnum } from 'src/constants/contractStatusEnum.enum';

@Injectable()
export class ContractRepository {
  constructor(
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
  ) {}

  async create(data: Partial<Contract>): Promise<Contract> {
    return new this.contractModel(data).save();
  }

  async findById(id: string): Promise<Contract | null> {
    return this.contractModel
      .findById(id)
      .populate('tournamentId horseId jockeyId horseOwnerId jockeyInvitationId')
      .lean()
      .exec();
  }

  async findByTournamentAndOwner(
    tournamentId: string,
    horseOwnerId: string,
  ): Promise<Contract[]> {
    return this.contractModel
      .find({
        tournamentId: new Types.ObjectId(tournamentId),
        horseOwnerId: new Types.ObjectId(horseOwnerId),
      })
      .populate('horseId jockeyId')
      .lean()
      .exec();
  }

  async findByJockeyId(jockeyId: string): Promise<Contract[]> {
    return this.contractModel
      .find({ jockeyId: new Types.ObjectId(jockeyId) })
      .populate('tournamentId horseId horseOwnerId')
      .lean()
      .exec();
  }

  async findByInvitationId(invitationId: string): Promise<Contract | null> {
    return this.contractModel
      .findOne({ jockeyInvitationId: new Types.ObjectId(invitationId) })
      .lean()
      .exec();
  }

  async findActiveContract(
    tournamentId: string,
    horseId: string,
    jockeyId: string,
  ): Promise<Contract | null> {
    return this.contractModel
      .findOne({
        tournamentId: new Types.ObjectId(tournamentId),
        horseId: new Types.ObjectId(horseId),
        jockeyId: new Types.ObjectId(jockeyId),
        status: ContractStatusEnum.ACTIVE,
      })
      .lean()
      .exec();
  }

  async findActiveContractByJockeyAndTournament(
    tournamentId: string,
    jockeyId: string,
  ) {
    return this.contractModel
      .findOne({
        tournamentId: new Types.ObjectId(tournamentId),
        jockeyId: new Types.ObjectId(jockeyId),
        status: ContractStatusEnum.ACTIVE,
      })
      .lean()
      .exec();
  }
}
