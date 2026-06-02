import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RaceConditionDocument = RaceCondition & Document;

export enum WeatherEnum {
  SUNNY = 'sunny',
  CLOUDY = 'cloudy',
  RAINY = 'rainy',
  WINDY = 'windy',
}

export enum TrackConditionEnum {
  GOOD = 'good',       // lý tưởng
  SOFT = 'soft',       // hơi ướt
  HEAVY = 'heavy',     // ướt nhiều, nặng
  MUDDY = 'muddy',     // bùn
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