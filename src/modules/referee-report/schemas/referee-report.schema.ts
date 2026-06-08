import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RefereeReportType } from '../../../constants/refereeReportType.enum';


@Schema({ collection: 'referee_reports', versionKey: false, timestamps: { createdAt: 'createAt', updatedAt: false } })
export class RefereeReport extends Document {
  @Prop({ type: Types.ObjectId, ref: 'RawResult', default: null })
  rawResultId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: true, index: true })
  raceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  refereeId: Types.ObjectId;

  @Prop({ type: String, enum: RefereeReportType, required: true })
  type: RefereeReportType;

  @Prop({ type: String, default: null })
  reason: string | null;

}

export const RefereeReportSchema = SchemaFactory.createForClass(RefereeReport);
RefereeReportSchema.index({ raceId: 1, type: 1 });