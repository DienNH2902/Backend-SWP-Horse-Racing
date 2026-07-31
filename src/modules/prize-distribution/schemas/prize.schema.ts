import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PrizeDocument = HydratedDocument<Prize>;

@Schema({ timestamps: true })
export class Prize {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tournament', required: true })
  tournamentId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: false })
  isDistributed: boolean;
}

export const PrizeSchema = SchemaFactory.createForClass(Prize);
