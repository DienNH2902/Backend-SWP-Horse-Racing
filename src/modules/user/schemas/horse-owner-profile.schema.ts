import { Types,HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type HorseOwnerProfileDocument =
  HydratedDocument<HorseOwnerProfile>;

@Schema({ timestamps: true })
export class HorseOwnerProfile {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId; // Nối với User có role 'Horse Owner'

  @Prop({ required: true })
  stableName: string; // Tên trang trại/chuồng ngựa

  @Prop()
  stableAddress: string;

  @Prop({ default: 0 })
  totalHorsesOwned: number;

  //auto
  @Prop({ type: Number, default: 0 })
  reputationPoints: number; // Điểm uy tín / danh tiếng của HorseOwner

  @Prop({ type: Number, default: 0.0 })
  balance: number; // Số dư tài khoản tiền thưởng của HorseOwner
}
export const HorseOwnerProfileSchema =
  SchemaFactory.createForClass(HorseOwnerProfile);
