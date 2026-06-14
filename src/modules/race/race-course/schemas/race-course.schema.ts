import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RaceCourseDocument = RaceCourse & Document;

export enum TrackTypeEnum {
  DIRT = 'Dirt',
  TURF = 'Turf',
  SYNTHETIC = 'Synthetic',
}

@Schema({ timestamps: true })
export class RaceCourse {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  location: string;

  @Prop({ type: String, enum: TrackTypeEnum, required: true })
  trackType: TrackTypeEnum;

  @Prop({ required: true, min: 0 })
  distance: number;

  @Prop({ trim: true })
  description: string;
}

export const RaceCourseSchema = SchemaFactory.createForClass(RaceCourse);