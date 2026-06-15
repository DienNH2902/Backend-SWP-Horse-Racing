import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RaceConditionDocument = RaceCondition & Document;

export enum WeatherEnum {
  SUNNY = 'Sunny',
  CLOUDY = 'Cloudy',
  RAINY = 'Rainy',
  WINDY = 'Windy',
}

export enum TrackConditionEnum {
  GOOD = 'Good',       // lý tưởng
  SOFT = 'Soft',       // hơi ướt
  HEAVY = 'Heavy',     // ướt nhiều, nặng
  MUDDY = 'Muddy',     // bùn
}

@Schema({ timestamps: true })
export class RaceCondition {
  @Prop({ type: Types.ObjectId, ref: 'Race', required: true, unique: true })
  raceId: Types.ObjectId;

  @Prop({ type: String, enum: WeatherEnum, required: true })
  weather: WeatherEnum;

  @Prop({ type: String, enum: TrackConditionEnum, required: true })
  trackCondition: TrackConditionEnum;

  @Prop({ required: true, min: 0 })
  windSpeed: number;
}

export const RaceConditionSchema = SchemaFactory.createForClass(RaceCondition);