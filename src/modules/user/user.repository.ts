import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { JockeyProfile } from './schemas/jockey-profile.schema';
import { HorseOwnerProfile } from './schemas/horse-owner-profile.schema';
import { RefereeProfile } from './schemas/referee-profile.schema';
import { UpdateJockeyProfileDto } from './dto/update-jockey-profile.dto';
import { UpdateHorseOwnerProfileDto } from './dto/update-horse-owner-profile.dto';
import { UpdateRefereeProfileDto } from './dto/update-referee-profile.dto';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(JockeyProfile.name)
    private jockeyModel: Model<JockeyProfile>,
    @InjectModel(HorseOwnerProfile.name)
    private horseOwnerModel: Model<HorseOwnerProfile>,
    @InjectModel(RefereeProfile.name)
    private refereeModel: Model<RefereeProfile>,
  ) {}

  async createUser(user: Partial<User>): Promise<User> {
    return new this.userModel(user).save();
  }

  async findAllUser(): Promise<User[]> {
    return await this.userModel
      .find()
      .populate({
        path: 'jockeyProfile',
        populate: { path: 'licenses' }, // Lồng thêm tầng này để kéo mảng chứng chỉ lên
      })
      .populate('spectatorProfile')
      .populate('refereeProfile')
      .populate('horseOwnerProfile')
      .lean({ virtuals: true })
      .exec();
  }

  async findOneUser(filter: QueryFilter<User>): Promise<User | null> {
    return await this.userModel
      .findOne(filter)
      .select('-password -__v')
      .populate({
        path: 'jockeyProfile',
        populate: { path: 'licenses' }, // Lồng thêm tầng này để kéo mảng chứng chỉ lên
      })
      .populate({ path: 'spectatorProfile' })
      .populate({ path: 'refereeProfile' })
      .populate({ path: 'horseOwnerProfile' })
      .lean({ virtuals: true })
      .exec();
  }

  async findOneUserWithPassword(email: string): Promise<User | null> {
    return await this.userModel
      .findOne({ email })
      .select('+password')
      .lean()
      .exec();
  }

  async findUserByIdAndUpdate(
    id: string,
    updateData: UpdateQuery<User>,
  ): Promise<User | null> {
    return await this.userModel
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .lean()
      .exec();
  }

  // async updateSpectatorProfile(userId: string, data: UpdateUserDto) {
  //   return await this.userModel
  //     .findOneAndUpdate({ userId: new Types.ObjectId(userId) }, data, {
  //       returnDocument: 'after',
  //     })
  //     .exec();
  // }

  async updateJockeyProfile(userId: string, data: UpdateJockeyProfileDto) {
    return await this.jockeyModel
      .findOneAndUpdate({ userId: new Types.ObjectId(userId) }, data, {
        returnDocument: 'after',
      })
      .exec();
  }

  async updateRefereeProfile(userId: string, data: UpdateRefereeProfileDto) {
    return await this.refereeModel
      .findOneAndUpdate({ userId: new Types.ObjectId(userId) }, data, {
        returnDocument: 'after',
      })
      .exec();
  }

  async updateHorseOwnerProfile(
    userId: string,
    data: UpdateHorseOwnerProfileDto,
  ) {
    return await this.horseOwnerModel
      .findOneAndUpdate({ userId: new Types.ObjectId(userId) }, data, {
        returnDocument: 'after',
      })
      .exec();
  }

  async deleteUser(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
