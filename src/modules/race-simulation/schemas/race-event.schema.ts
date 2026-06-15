import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum RaceEventType {
  STUMBLE = 'stumble',
  BURST = 'burst',
  OVERTAKE = 'overtake',
  LEAD_CHANGE = 'lead_change',
}

@Schema({ timestamps: true })
export class RaceEvent {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true })
  raceId: Types.ObjectId;

  @Prop({ required: true })
  tickNumber: number;

  @Prop({ required: true, enum: RaceEventType })
  eventType: RaceEventType;

  // Con ngựa chính của event (stumble/burst/overtake/lead_change)
  @Prop({ type: Types.ObjectId, ref: 'Horse', required: true })
  primaryHorseId: Types.ObjectId;

  // Con ngựa bị vượt qua (chỉ dùng cho overtake)
  @Prop({ type: Types.ObjectId, ref: 'Horse', default: null })
  secondaryHorseId: Types.ObjectId | null;
}

export const RaceEventSchema = SchemaFactory.createForClass(RaceEvent);
RaceEventSchema.index({ raceId: 1, tickNumber: 1 });