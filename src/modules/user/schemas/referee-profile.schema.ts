import { Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class RefereeProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId; // Nối với User có role 'Referee'

  @Prop({ required: true })
  licenseNumber: string;

  @Prop({ default: 0 })
  experienceYears: number;

  @Prop()
  certificationLevel: string; // Cấp bậc chứng chỉ quốc tế/quốc gia
}
export const RefereeProfileSchema =
  SchemaFactory.createForClass(RefereeProfile);
