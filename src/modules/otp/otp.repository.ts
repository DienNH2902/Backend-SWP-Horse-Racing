import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Otp, OtpDocument } from './schemas/otp.schema';

@Injectable()
export class OtpRepository {
  constructor(
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
  ) {}

  // Tạo mới một mã OTP xác thực
  async createOtp(data: {
    userId: Types.ObjectId;
    email: string;
    code: string;
    expiresAt: Date;
  }): Promise<Otp> {
    return new this.otpModel(data).save();
  }

  // Tìm kiếm mã OTP hợp lệ gần nhất dựa vào email và code chưa qua sử dụng
  async findValidOtp(email: string, code: string): Promise<Otp | null> {
    return await this.otpModel
      .findOne({
        email: email,
        code,
        isUsed: false,
        expiresAt: { $gt: new Date() }, // Còn hạn sử dụng
      })
      .exec();
  }

  // Đánh dấu mã OTP đã được sử dụng
  async markAsUsed(id: Types.ObjectId): Promise<void> {
    await this.otpModel
      .findByIdAndUpdate(id, { $set: { isUsed: true } })
      .exec();
  }

  // Vô hiệu hóa toàn bộ OTP cũ của một Email khi có yêu cầu mới (Chống spam)
  async invalidateOldOtps(email: string): Promise<void> {
    await this.otpModel
      .updateMany({ email: email, isUsed: false }, { $set: { isUsed: true } })
      .exec();
  }
}
