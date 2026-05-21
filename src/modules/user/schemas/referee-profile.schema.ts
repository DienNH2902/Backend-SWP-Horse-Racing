import { Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class RefereeProfile {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId; // Nối với User có role 'Referee'

  @Prop({ default: 0 })
  experienceYears: number;

  @Prop()
  certification: string; // Cấp bậc chứng chỉ quốc tế/quốc gia

  //auto
  @Prop({ type: Number, default: 0 })
  reputationPoints: number; // Điểm uy tín/danh tiếng của trọng tài

  @Prop({ type: Number, default: 0 })
  racesAttempt: number; // Số lượng trận đua mà trọng tài này đã từng điều khiển/bắt chính
}
export const RefereeProfileSchema =
  SchemaFactory.createForClass(RefereeProfile);
