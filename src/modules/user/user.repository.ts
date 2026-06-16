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
import { RoleEnum } from 'src/constants/roleEnum.enum';
import { JockeyStatusEnum } from 'src/constants/jockeyStatusEnum.enum';
import { AccountStatusEnum } from 'src/constants/accountStatusEnum.enum';

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
      .populate({
        path: 'horseOwnerProfile',
        populate: { path: 'totalHorsesOwned' },
      })
      .lean({ virtuals: true })
      .exec();
  }

  // async findAllJockeys(): Promise<User[]> {
  //   return await this.userModel
  //     .find({ role: RoleEnum.JOCKEY })
  //     .populate({
  //       path: 'jockeyProfile',
  //       populate: { path: 'licenses' }, // Lồng thêm tầng này để kéo mảng chứng chỉ lên
  //     })
  //     .lean()
  //     .exec();
  // }

  async findAllUsersByRole(
    role: RoleEnum,
    jockeyStatus?: JockeyStatusEnum,
  ): Promise<User[]> {
    const query = this.userModel.find({ role }).select('-password -__v');

    switch (role) {
      case RoleEnum.JOCKEY: {
        // Tạo object filter cho bảng populate phụ
        const matchFilter: any = {};
        if (jockeyStatus) {
          matchFilter.jockeyStatus = jockeyStatus; // Lọc chính xác trạng thái từ enum
        }

        query.populate({
          path: 'jockeyProfile',
          match: matchFilter as Record<string, unknown>, // <-- Mongoose sẽ chỉ lọc các profile khớp điều kiện này
          populate: { path: 'licenses' },
        });
        break;
      }

      case RoleEnum.REFEREE:
        query.populate('refereeProfile');
        break;
      case RoleEnum.HORSE_OWNER:
        query.populate({
          path: 'horseOwnerProfile',
          populate: { path: 'totalHorsesOwned' },
        });
        break;
      case RoleEnum.SPECTATOR:
        query.populate('spectatorProfile');
        break;
    }

    const results = await query.lean({ virtuals: true }).exec();

    // Vì sử dụng `match` trong populate, những User có role Jockey nhưng profile không khớp điều kiện
    // sẽ bị gán `jockeyProfile: null`. Bạn cần lọc bỏ những phần tử này trước khi trả về dữ liệu.
    if (role === RoleEnum.JOCKEY && jockeyStatus) {
      return results.filter((user: any) => user.jockeyProfile !== null);
    }

    return results;
  }

  async totalHorseOwned(ownerId: string) {
    return await this.horseOwnerModel
      .findById(ownerId)
      .populate('totalHorsesOwned')
      .exec();
  }

  // Output trả về sẽ tự có trường: totalHorsesOwned: 5 (nếu có 5 con ngựa trong DB)

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
      .populate({
        path: 'horseOwnerProfile',
        populate: { path: 'totalHorsesOwned' },
      })
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

  async updatePassword(id: string, hashedPass: string): Promise<User | null> {
    return await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { password: hashedPass } },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();
  }

  async updateAccountStatus(
    id: string,
    accountStatus: AccountStatusEnum,
  ): Promise<User | null> {
    return await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { status: accountStatus } },
        { returnDocument: 'after' },
      )
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
