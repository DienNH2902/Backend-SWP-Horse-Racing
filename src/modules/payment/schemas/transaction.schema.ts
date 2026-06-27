// ============================================================
// File: transaction.schema.ts
// CHỈ THAY ĐỔI @Prop của senderId — bỏ required: true, thêm default: null.
// Lý do: khi hệ thống (SystemWallet) trả tiền RA cho user (vd prize payout),
// senderId = null đại diện "Platform/System" — đối xứng với quy ước
// receiverId = null đã có sẵn khi tiền chảy VÀO hệ thống (entry fee).
// ============================================================
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TransactionTypeEnum } from 'src/constants/transactionType.enum';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  /**
   * senderId = null khi là giao dịch hệ thống trả ra (vd: prize payout, refund)
   * receiverId = null khi là giao dịch hệ thống nhận vào (vd: entry fee)
   */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  senderId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  receiverId: Types.ObjectId | null;

  @Prop({ trim: true })
  content: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({
    type: String,
    enum: TransactionTypeEnum,
    required: true,
  })
  type: TransactionTypeEnum;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
