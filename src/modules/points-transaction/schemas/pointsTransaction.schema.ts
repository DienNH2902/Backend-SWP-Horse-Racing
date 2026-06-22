import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PointsTransactionType } from 'src/constants/pointsTransactionTypeEnum.enum';

export type PointsTransactionDocument = PointsTransaction & Document;

@Schema({ timestamps: true })
export class PointsTransaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: PointsTransactionType })
  type: PointsTransactionType;

  @Prop({ type: Number, required: true })
  amount: number; // Số điểm biến động (Luôn lưu số dương)

  @Prop({ type: Number, required: true })
  balanceAfter: number; // Số dư pointBalance sau khi thực hiện giao dịch

  @Prop({ type: String, required: true })
  reason: string; // Lý do biến động (Ví dụ: "Mua Khung Avatar Vàng", "Nhận mốc HAHA points")

  @Prop({ type: Types.ObjectId, ref: 'Reward' })
  rewardId?: Types.ObjectId; // Liên kết tới phần thưởng (nếu có)
}

export const PointsTransactionSchema =
  SchemaFactory.createForClass(PointsTransaction);
