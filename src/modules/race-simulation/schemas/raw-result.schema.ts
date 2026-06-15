import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum RawResultStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
}

@Schema({ timestamps: true })
export class RawResult {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true })
  raceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Horse', required: true })
  horseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'JockeyProfile', required: true })
  jockeyId: Types.ObjectId;

  @Prop({ required: true })
  rawRank: number;

  @Prop({ required: true })
  finalRank: number;

  @Prop({ enum: RawResultStatus, default: RawResultStatus.PENDING })
  status: RawResultStatus;

  @Prop({ type: Date, required: true })
  finishedTime: Date;
}

export const RawResultSchema = SchemaFactory.createForClass(RawResult);
RawResultSchema.index({ raceId: 1, rawRank: 1 });