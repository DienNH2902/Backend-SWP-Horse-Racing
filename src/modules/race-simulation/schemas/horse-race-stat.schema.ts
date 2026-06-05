import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'horse_race_stats', versionKey: false })
export class HorseRaceStats extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Race', required: true, index: true })
  raceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Horse', required: true })
  horseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'JockeyProfile', required: true })
  jockeyId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  totalLoad: number;

  @Prop({ type: Number, required: true })
  baseSpeed: number;

  @Prop({ type: Number, required: true })
  acceleration: number;

  @Prop({ type: Number, required: true })
  stamina: number;

  // snapshot winRate tại thời điểm race — phục vụ audit
  @Prop({ type: Number, required: true })
  totalWin: number;
}

export const HorseRaceStatsSchema = SchemaFactory.createForClass(HorseRaceStats);
HorseRaceStatsSchema.index({ raceId: 1, horseId: 1 }, { unique: true });