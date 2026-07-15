import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { Contract, ContractDocument } from './schemas/contract.schema';
import { ContractStatusEnum } from 'src/constants/contractStatusEnum.enum';
import { FilterContractDto } from './dto/filter-contract.dto';

@Injectable()
export class ContractRepository {
  constructor(
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
  ) {}

  async create(data: Partial<Contract>): Promise<Contract> {
    return new this.contractModel(data).save();
  }

  async getAllContracts(filterDto: FilterContractDto): Promise<Contract[]> {
    const query: QueryFilter<ContractDocument> = {};

    if (filterDto.status) {
      query.status = filterDto.status;
    }

    if (filterDto.tournamentId) {
      query.tournamentId = new Types.ObjectId(filterDto.tournamentId);
    }

    return this.contractModel
      .find(query)
      .sort({ createdAt: -1 }) // Sắp xếp giảm dần theo thời gian tạo
      .lean()
      .exec();
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

  async updateStatus(
    id: string,
    status: ContractStatusEnum,
  ): Promise<Contract | null> {
    return this.contractModel
      .findByIdAndUpdate(id, { $set: { status } }, { returnDocument: 'after' })
      .lean()
      .exec();
  }

  // Kiểm tra xem User có hợp đồng nào bị BREACHED trong giải đấu hay không
  async hasBreachedContractInTournament(
    tournamentId: string,
    userId: string,
  ): Promise<boolean> {
    const count = await this.contractModel.countDocuments({
      tournamentId: new Types.ObjectId(tournamentId),
      status: ContractStatusEnum.BREACHED,
      $or: [
        { horseOwnerId: new Types.ObjectId(userId) },
        { jockeyId: new Types.ObjectId(userId) },
      ],
    });
    return count > 0;
  }
}
