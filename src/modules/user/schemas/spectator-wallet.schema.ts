import { Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class SpectatorWallet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId; // Nối với User có role 'Spectator'

  @Prop({ required: true, default: 0 })
  balance: number; // Số dư xu ảo/điểm thưởng

  @Prop({ type: String, default: 'VND' })
  currency: string;
}
export const SpectatorWalletSchema =
  SchemaFactory.createForClass(SpectatorWallet);
