// src/bet/schemas/bet.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BetResultEnum } from 'src/constants/betResultStatusEnum.enum';

export type BetDocument = Bet & Document;

@Schema({ timestamps: true })
export class Bet {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  spectatorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Race' })
  raceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Horse' })
  horseId: Types.ObjectId;

  @Prop({ required: true, min: 0, max: 100 })
  horseWinRateAtBet: number; // Tỷ lệ thắng lưu tại thời điểm bet (0 - 100)

  @Prop({ required: true, min: 0 })
  bettorsOnHorseAtBet: number; // Số người cược con này tại thời điểm bet

  @Prop({ required: true, min: 0 })
  totalBettorsAtBet: number; // Tổng số người cược toàn race tại thời điểm bet

  @Prop({ required: true, min: 1.0 })
  finalOdds: number; // Tỷ lệ thưởng tính toán theo công thức lúc bet

  @Prop({ required: true, min: 1 })
  pointsWagered: number; // Số điểm đặt cược

  @Prop({ default: 0 })
  pointsWon: number; // Số điểm thắng (0 nếu đang chờ hoặc thua)

  @Prop({ type: String, enum: BetResultEnum, default: BetResultEnum.PENDING })
  result: BetResultEnum;

  @Prop({ type: Date, default: Date.now })
  placedAt: Date;

  @Prop({ default: false })
  isInsuranceCardUsed: boolean;
}

export class UserWallet {
  // Đại diện cấu trúc User để cập nhật points
  totalPoints: number;
  pointBalance: number;
}

export const BetSchema = SchemaFactory.createForClass(Bet);
BetSchema.index({ spectatorId: 1, raceId: 1 }, { unique: true }); // Khóa trùng: mỗi người chỉ bet 1 lần/race
