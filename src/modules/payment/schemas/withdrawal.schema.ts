import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WithdrawalStatusEnum } from 'src/constants/withdrawalStatusEnum.enum';

export type WithdrawalRequestDocument = WithdrawalRequest & Document;

@Schema({ timestamps: true })
export class WithdrawalRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  bankName: string; // Tên ngân hàng (ví dụ: Vietcombank)

  @Prop({ required: true })
  accountNumber: string; // Số tài khoản ngân hàng

  @Prop({ required: true })
  accountName: string; // Tên chủ tài khoản (Chữ hoa không dấu)

  @Prop({ required: true, min: 1 })
  amount: number; // Số tiền rút

  @Prop({ trim: true, default: '' })
  content: string; // Nội dung/Lý do rút tiền từ User

  @Prop({
    type: String,
    enum: WithdrawalStatusEnum,
    default: WithdrawalStatusEnum.PENDING,
  })
  status: WithdrawalStatusEnum;

  @Prop({ trim: true, default: '' })
  adminNote: string; // Ghi chú của Admin khi duyệt/từ chối
}

export const WithdrawalRequestSchema =
  SchemaFactory.createForClass(WithdrawalRequest);
