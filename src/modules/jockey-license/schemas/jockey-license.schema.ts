import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class JockeyLicense {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'JockeyProfile', required: true })
  jockeyProfileId: Types.ObjectId; // Khóa ngoại FK nối với bảng JockeyProfile

  @Prop({ required: true })
  licenseCode: string; // Mã số chứng chỉ/bằng cấp

  @Prop({ required: true })
  licenseUrl: string; // Đường dẫn ảnh hoặc file PDF của chứng chỉ

  @Prop({ type: Date, required: true })
  racingStartDate: Date; // Ngày bắt đầu có hiệu lực thi đấu
}

export const JockeyLicenseSchema = SchemaFactory.createForClass(JockeyLicense);
