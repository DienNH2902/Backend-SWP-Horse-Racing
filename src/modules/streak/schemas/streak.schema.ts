import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StreakDocument = Streak & Document;

@Schema({ timestamps: true })
export class Streak {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  fullName: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: Number, default: 0 })
  currentStreak: number;

  @Prop({ type: Number, default: 0 })
  longestStreak: number;

  @Prop({ type: Date, required: true })
  lastLoginDate: Date; // Lưu mốc thời gian dạng 00:00:00 để dễ so sánh ngày
}

export const StreakSchema = SchemaFactory.createForClass(Streak);
