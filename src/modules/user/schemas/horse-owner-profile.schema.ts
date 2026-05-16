import { Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class HorseOwnerProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId; // Nối với User có role 'Horse Owner'

  @Prop({ required: true })
  stableName: string; // Tên trang trại/chuồng ngựa

  @Prop()
  stableAddress: string;

  @Prop({ default: 0 })
  totalHorsesOwned: number;
}
export const HorseOwnerProfileSchema =
  SchemaFactory.createForClass(HorseOwnerProfile);
