import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { RefereeReportType } from '../../../constants/refereeReportType.enum';

@Schema({ timestamps: true })
export class RefereeReport {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'RawResult', default: null })
  rawResultId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true })
  raceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  refereeId: Types.ObjectId;

  @Prop({ required: true, enum: RefereeReportType })
  type: RefereeReportType;

  @Prop({ type: String, default: null })
  reason: string | null;
}

export const RefereeReportSchema = SchemaFactory.createForClass(RefereeReport);
RefereeReportSchema.index({ raceId: 1, type: 1 });