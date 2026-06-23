import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type SystemWalletDocument = HydratedDocument<SystemWallet>;

@Schema({
  timestamps: true,
})
export class SystemWallet {
  _id: Types.ObjectId;

  @Prop({ required: true, default: 'SYSTEM_MAIN_WALLET', unique: true })
  walletName: string; // Định danh ví hệ thống chính

  @Prop({ type: Number, required: true, default: 0 })
  balance: number; // Tiền thực tế hệ thống đang sở hữu (entryFee, 10% commission,...)

  @Prop({ type: Number, required: true, default: 0 })
  totalRevenue: number; // Thống kê lũy kế tổng doanh thu đã thu từ trước đến nay (chỉ tăng không giảm)
}

export const SystemWalletSchema = SchemaFactory.createForClass(SystemWallet);
