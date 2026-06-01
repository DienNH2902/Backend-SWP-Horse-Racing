import { Types, HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type HorseOwnerProfileDocument = HydratedDocument<HorseOwnerProfile>;

// Bắt buộc phải bật { toJSON: { virtuals: true }, toObject: { virtuals: true } } để Virtual hiển thị ra ngoài
@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class HorseOwnerProfile {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId; // Nối với User có role 'Horse Owner'

  @Prop({ required: true })
  stableName: string; // Tên trang trại/chuồng ngựa

  @Prop()
  stableAddress: string;

  // @Prop({ default: 0 })
  // totalHorsesOwned: number;

  //auto
  @Prop({ type: Number, default: 0 })
  reputationPoints: number; // Điểm uy tín / danh tiếng của HorseOwner

  @Prop({ type: Number, default: 0.0 })
  balance: number; // Số dư tài khoản tiền thưởng của HorseOwner
}
export const HorseOwnerProfileSchema =
  SchemaFactory.createForClass(HorseOwnerProfile);

// Định nghĩa lại Virtual trường 'totalHorsesOwned' kết nối sang bảng 'Horse'
HorseOwnerProfileSchema.virtual('totalHorsesOwned', {
  ref: 'Horse', // Giữ nguyên tên Model bảng Ngựa của bạn
  localField: 'userId', // [SỬA LẠI]: Lấy userId (6a158d0dd0caea5be1a3b936) của profile làm mốc so sánh
  foreignField: 'userId', // [SỬA LẠI]: Trỏ thẳng vào trường userId (6a158d0dd0caea5be1a3b936) nằm trong file horse.schema.ts
  count: true, // Giữ nguyên tính năng chỉ đếm số lượng
});
