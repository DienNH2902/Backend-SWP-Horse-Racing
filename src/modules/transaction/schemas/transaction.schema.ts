import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TransactionTypeEnum } from 'src/constants/transactionType.enum';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  /**
   * receiverId = null khi là entry_fee vào hệ thống (system transaction)
   */
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
