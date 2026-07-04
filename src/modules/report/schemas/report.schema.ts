import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ReportCategory } from 'src/constants/reportCategoryEnum.enum';
import { ReportStatus } from 'src/constants/reportStatusEnum.enum';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ReportCategory })
  category: ReportCategory;

  @Prop({ type: String, required: true, minlength: 10, maxlength: 1000 })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Race', required: false })
  relatedRaceId?: Types.ObjectId; // ID cuộc đua liên quan nếu có

  @Prop({
    type: String,
    required: true,
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Prop({ type: String, required: false, default: '' })
  adminNotes?: string; // Ghi chú phản hồi của Admin khi duyệt/từ chối

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  resolvedBy?: Types.ObjectId; // Admin xử lý ca này
}

export const ReportSchema = SchemaFactory.createForClass(Report);
