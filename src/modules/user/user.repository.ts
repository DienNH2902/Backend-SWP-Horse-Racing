import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, UpdateQuery } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(user: Partial<User>): Promise<User> {
    return new this.userModel(user).save();
  }

  async findAllUser(): Promise<User[]> {
    return await this.userModel
      .find()
      .populate('gender role status')
      .lean()
      .exec();
  }

  async findOneUser(filter: QueryFilter<User>): Promise<User | null> {
    return await this.userModel
      .findOne(filter)
      .select('-password -__v')
      .populate('gender role status')
      .lean()
      .exec();
  }

  async findUserByIdAndUpdate(
    id: string,
    updateData: UpdateQuery<User>,
  ): Promise<User | null> {
    return await this.userModel
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .populate('gender role status')
      .lean()
      .exec();
  }

  async deleteUser(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
