import { Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class SpectatorProfile {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId; // Nối với User có role 'Spectator'

  @Prop({ type: Number, default: 50 })
  pointBalance: number; // Số dư điểm hiện tại để dùng đặt cược

  @Prop({ type: Number, default: 0.0 })
  winRate: number; // Tỉ lệ đoán trúng (Ví dụ: 0.65 tương đương 65%)

  @Prop({ type: Number, default: 50.0 })
  totalPoints: number; // Tổng số điểm tích lũy/kiếm được từ trước đến nay

  @Prop({ type: Number, default: 0 })
  totalBets: number; // Tổng số lượt đã tham gia đặt cược
}
export const SpectatorProfileSchema =
  SchemaFactory.createForClass(SpectatorProfile);
