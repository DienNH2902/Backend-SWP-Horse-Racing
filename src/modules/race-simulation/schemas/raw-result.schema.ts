// Placeholder — thay bằng import từ raw-result module thực tế của bạn
// File này chỉ cần nếu RawResult chưa có module riêng

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum RawResultStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
}

@Schema({ collection: 'raw_results', versionKey: false })
export class RawResult extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Race', required: true, index: true })
  raceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Horse', required: true })
  horseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'JockeyProfile', required: true })
  jockeyId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  rawRank: number;

  @Prop({ type: Number, required: true })
  finalRank: number;

  @Prop({ type: String, enum: RawResultStatus, default: RawResultStatus.PENDING })
  status: RawResultStatus;

  @Prop({ type: Date, required: true })
  finishedTime: Date;
}

export const RawResultSchema = SchemaFactory.createForClass(RawResult);
RawResultSchema.index({ raceId: 1, rawRank: 1 });