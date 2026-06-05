import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'race_ticks', versionKey: false })
export class RaceTick extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Race', required: true, index: true })
  raceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Horse', required: true })
  horseId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  tickNumber: number;

  @Prop({ type: Number, required: true, min: 0, max: 1 })
  progress: number;

  @Prop({ type: Number, required: true })
  currentSpeed: number;

  @Prop({ type: Number, required: true })
  lane: number;
}

export const RaceTickSchema = SchemaFactory.createForClass(RaceTick);

// Index compound để query nhanh khi broadcast
RaceTickSchema.index({ raceId: 1, tickNumber: 1 });
RaceTickSchema.index({ raceId: 1, horseId: 1, tickNumber: 1 });