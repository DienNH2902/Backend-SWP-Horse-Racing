import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, UpdateQuery } from 'mongoose';
import {
  JockeyInvitation,
  JockeyInvitationDocument,
} from './schemas/invitation.schema';
import { JockeyInvitationEnum } from 'src/constants/jockeyInvitationEnum.enum';

@Injectable()
export class JockeyInvitationRepository {
  constructor(
    @InjectModel(JockeyInvitation.name)
    private readonly jockeyInvitationModel: Model<JockeyInvitationDocument>,
  ) {}

  async create(data: Partial<JockeyInvitation>): Promise<JockeyInvitation> {
    return new this.jockeyInvitationModel(data).save();
  }

  async findById(id: string): Promise<JockeyInvitation | null> {
    return this.jockeyInvitationModel
      .findById(id)
      .populate('tournamentId horseId jockeyId horseOwnerId')
      .lean()
      .exec();
  }

  // Cũng là lấy 1 thư mời nhưng không populate để cho contract chỉ lưu String ObjectId, không lưu object
  async findByIdForContract(id: string): Promise<JockeyInvitation | null> {
    return this.jockeyInvitationModel.findById(id).lean().exec();
  }

  // Tất cả invitation gửi đến jockey này (để jockey xem)
  async findByJockeyId(jockeyId: string): Promise<JockeyInvitation[]> {
    return this.jockeyInvitationModel
      .find({ jockeyId: new Types.ObjectId(jockeyId) })
      .populate('tournamentId horseId horseOwnerId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // Tất cả invitation do horseOwner này gửi đi (để owner quản lý)
  async findByHorseOwnerId(horseOwnerId: string): Promise<JockeyInvitation[]> {
    return this.jockeyInvitationModel
      .find({ horseOwnerId: new Types.ObjectId(horseOwnerId) })
      .populate('tournamentId horseId jockeyId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // Kiểm tra có PENDING nào tồn tại không (cho unique constraint check ở app layer)
  async findPending(
    tournamentId: string,
    horseId: string,
    jockeyId: string,
  ): Promise<JockeyInvitation | null> {
    return this.jockeyInvitationModel
      .findOne({
        tournamentId: new Types.ObjectId(tournamentId),
        horseId: new Types.ObjectId(horseId),
        jockeyId: new Types.ObjectId(jockeyId),
        status: JockeyInvitationEnum.PENDING,
      })
      .lean()
      .exec();
  }

  async updateById(
    id: string,
    updateData: UpdateQuery<JockeyInvitation>,
  ): Promise<JockeyInvitation | null> {
    return this.jockeyInvitationModel
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .lean()
      .exec();
  }

  // Cập nhật trạng thái của thư mời (Đã đóng gói toán tử $set ngầm bên trong)
  async updateStatus(
    id: string,
    status: JockeyInvitationEnum,
  ): Promise<JockeyInvitation | null> {
    return this.jockeyInvitationModel
      .findByIdAndUpdate(
        id,
        { $set: { status: status } },
        { returnDocument: 'after' }, // Đảm bảo trả về bản ghi mới nhất sau khi sửa
      )
      .lean()
      .exec();
  }

  // Dùng cho cron job expire invitation quá hạn
  async expireOlderThan(date: Date): Promise<number> {
    const result = await this.jockeyInvitationModel.updateMany(
      {
        status: JockeyInvitationEnum.PENDING,
        createdAt: { $lt: date },
      },
      { $set: { status: JockeyInvitationEnum.EXPIRED } },
    );
    return result.modifiedCount;
  }
}
