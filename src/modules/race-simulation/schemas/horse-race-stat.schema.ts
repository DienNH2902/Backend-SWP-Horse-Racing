import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class HorseRaceStats {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true })
  raceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Horse', required: true })
  horseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'JockeyProfile', required: true })
  jockeyId: Types.ObjectId;

  @Prop({ required: true })
  totalLoad: number;

  @Prop({ required: true })
  baseSpeed: number;

  @Prop({ required: true })
  acceleration: number;

  @Prop({ required: true })
  stamina: number;

  @Prop({ required: true })
  totalWin: number;

  @Prop({ required: true })
  horseWinRate: number;

  @Prop({ required: true })
  jockeyWinRate: number;
}

export const HorseRaceStatsSchema = SchemaFactory.createForClass(HorseRaceStats);
HorseRaceStatsSchema.index({ raceId: 1, horseId: 1 }, { unique: true });