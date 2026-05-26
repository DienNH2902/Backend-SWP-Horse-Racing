// src/modules/horse/schemas/horse.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { HorseStatusEnum } from 'src/constants/horseStatusEnum.enum';

export type HorseDocument = Horse & Document;

@Schema({ timestamps: true })
export class Horse {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  color: string;

  @Prop({
    type: String,
    enum: HorseStatusEnum,
    default: HorseStatusEnum.IDLE,
  })
  horseStatus: HorseStatusEnum;

  @Prop({ required: true, min: 0 })
  height: number;

  @Prop({ required: true, min: 0 })
  weight: number;

  @Prop({ default: 0, min: 0, max: 100 })
  winRate: number;

  @Prop({ default: 0, min: 0 })
  totalWin: number;
}

export const HorseSchema = SchemaFactory.createForClass(Horse);
