import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OtpDocument = HydratedDocument<Otp>;

@Schema({
  timestamps: true,
})
export class Otp {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  code: string; // Lưu mã OTP 6 số

  @Prop({ type: Date, required: true })
  expiresAt: Date; // Thời gian hết hạn của mã

  @Prop({ type: Boolean, default: false })
  isUsed: boolean; // Trạng thái mã đã được sử dụng hay chưa
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

// Tạo Index tự động xóa bản ghi khi hết hạn (TTL Index) để giải phóng RAM/Bộ nhớ cho DB
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
