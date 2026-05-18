import { Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class JockeyProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId; // Nối với User có role 'Jockey'

  @Prop({ required: true })
  licenseNumber: string;

  @Prop({ default: 0 })
  experienceYears: number;

  @Prop({ required: true })
  weight: number; // Cân nặng (rất quan trọng với Jockey)

  @Prop({ required: true })
  height: number;

  @Prop({ type: String, default: 'Available' })
  status: string; // Available, Training, Suspended, Injured

  @Prop({ type: Number, default: 0.0 })
  winRate: number; // Tỉ lệ thắng (Ví dụ: 0.25 tương đương 25%)

  @Prop({ type: Number, default: 0 })
  reputationPoints: number; // Điểm uy tín / danh tiếng của Jockey

  @Prop({ type: Number, default: 0.0 })
  balance: number; // Số dư tài khoản tiền thưởng của Jockey
}
export const JockeyProfileSchema = SchemaFactory.createForClass(JockeyProfile);
