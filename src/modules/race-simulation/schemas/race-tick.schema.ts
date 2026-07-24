  import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
  import { Types } from 'mongoose';

  @Schema({ timestamps: true })
  export class RaceTick {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Race', required: true })
    raceId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Horse', required: true })
    horseId: Types.ObjectId;

    @Prop({ required: true })
    tickNumber: number;

    @Prop({ required: true, min: 0, max: 1 })
    progress: number;

    @Prop({ required: true })
    currentSpeed: number;

    @Prop({ required: true })
    lane: number;
  }

  export const RaceTickSchema = SchemaFactory.createForClass(RaceTick);
  RaceTickSchema.index({ raceId: 1, tickNumber: 1 });
  RaceTickSchema.index({ raceId: 1, horseId: 1, tickNumber: 1 });