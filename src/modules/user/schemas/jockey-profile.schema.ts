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
}
export const JockeyProfileSchema = SchemaFactory.createForClass(JockeyProfile);
