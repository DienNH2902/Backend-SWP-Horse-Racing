import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClaimedRewardDocument = ClaimedReward & Document;

@Schema({ timestamps: true })
export class ClaimedReward {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Reward', required: true })
  rewardId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  claimedAt: Date;

  @Prop({ type: Boolean, default: false }) // Thêm trường quản lý trạng thái sử dụng
  isUsed: boolean;
}

export const ClaimedRewardSchema = SchemaFactory.createForClass(ClaimedReward);

// Đảm bảo dữ liệu không bị trùng lặp: một user chỉ được sở hữu/nhận một phần thưởng 1 lần
ClaimedRewardSchema.index({ userId: 1, rewardId: 1 }, { unique: true });
