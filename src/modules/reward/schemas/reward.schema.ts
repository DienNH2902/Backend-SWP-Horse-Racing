import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RewardConditionType } from 'src/constants/rewardConditionTypeEnum.enum';
import { RewardType } from 'src/constants/rewardTypeEnum.enum';

export type RewardDocument = Reward & Document;

@Schema({ timestamps: true })
export class Reward {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true, enum: RewardConditionType })
  conditionType: RewardConditionType;

  @Prop({ type: Number, required: true })
  requiredValue: number; // Mốc totalPoints cần đạt HOẶC giá mua bằng pointBalance

  @Prop({ type: String, required: true, enum: RewardType })
  rewardType: RewardType;

  @Prop({ type: String, required: true })
  rewardValue: string; // Số điểm cộng (ví dụ: '50') hoặc đường dẫn URL tới asset hình ảnh nền/khung

  @Prop({ type: String })
  description: string;
}

export const RewardSchema = SchemaFactory.createForClass(Reward);
