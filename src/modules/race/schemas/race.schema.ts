import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RaceStatusEnum } from '../../../constants/raceStatus.enum';

export type RaceDocument = Race & Document;

@Schema({ timestamps: true })
export class Race {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tournament', required: true })
  tournamentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  refereeId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'RaceCourse', default: null })
  raceCourseId: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 1 })
  roundNumber: number;

  /**
   * Thứ tự race trong tournament, tự tăng khi tạo.
   * Vd: tournament có 6 races → raceOrder = 1, 2, 3, 4, 5, 6
   */
  @Prop({ required: true, min: 1 })
  raceOrder: number;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  date: Date;

  @Prop({ default: 0, min: 0 })
  totalBettors: number;

  @Prop({
    type: String,
    enum: RaceStatusEnum,
    default: RaceStatusEnum.SCHEDULED,
  })
  status: RaceStatusEnum;

  @Prop({ type: Date, default: null })
  refereeConfirmedAt: Date | null;

  @Prop({ type: Date, default: null })
  simulatedAt: Date | null;
}

export const RaceSchema = SchemaFactory.createForClass(Race);

// Index để query nhanh theo tournament + round
RaceSchema.index({ tournamentId: 1, roundNumber: 1 });
RaceSchema.index({ tournamentId: 1, raceOrder: 1 }, { unique: true });
