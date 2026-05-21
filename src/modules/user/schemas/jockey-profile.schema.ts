import { Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { JockeyStatusEnum } from 'src/constants/jockeyStatusEnum.enum';

@Schema({ timestamps: true })
export class JockeyProfile {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId; // Nối với User có role 'Jockey'

  @Prop({ required: true })
  weight: number; // Cân nặng (rất quan trọng với Jockey)

  @Prop({ required: true })
  height: number;

  @Prop({
    type: String,
    enum: JockeyStatusEnum,
    default: JockeyStatusEnum.PENDING_APPROVAL,
    required: true,
  })
  jockeyStatus: JockeyStatusEnum;

  // Lưu trữ link ảnh hoặc file PDF chứng chỉ hành nghề do Jockey tải lên
  @Prop({ required: false })
  license?: string;

  // Lý do từ chối nếu admin bấm Reject hồ sơ
  @Prop({ required: false })
  rejectionReason?: string;

  @Prop({ type: Number, default: 0.0 })
  winRate: number; // Tỉ lệ thắng (Ví dụ: 0.25 tương đương 25%)

  @Prop({ type: Number, default: 0 })
  reputationPoints: number; // Điểm uy tín / danh tiếng của Jockey

  @Prop({ type: Number, default: 0.0 })
  balance: number; // Số dư tài khoản tiền thưởng của Jockey
}
export const JockeyProfileSchema = SchemaFactory.createForClass(JockeyProfile);

JockeyProfileSchema.virtual('licenses', {
  ref: 'JockeyLicense', // Tên Model cần liên kết tới
  localField: '_id', // Khóa chính của bảng JockeyProfile
  foreignField: 'jockeyProfileId', // Khóa ngoại nằm ở bảng JockeyLicense
  justOne: false, // Định dạng mảng (Một nài ngựa có nhiều chứng chỉ)
});

// BẮT BUỘC PHẢI THÊM 2 DÒNG NÀY ĐỂ KHI CHUYỂN SANG JSON KHÔNG BỊ MẤT VIRTUAL
JockeyProfileSchema.set('toJSON', { virtuals: true });
JockeyProfileSchema.set('toObject', { virtuals: true });
