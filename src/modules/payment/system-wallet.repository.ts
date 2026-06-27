import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import {
  SystemWallet,
  SystemWalletDocument,
} from './schemas/systemWallet.schema';

const MAIN_WALLET_NAME = 'SYSTEM_MAIN_WALLET';

@Injectable()
export class SystemWalletRepository {
  constructor(
    @InjectModel(SystemWallet.name)
    private readonly systemWalletModel: Model<SystemWalletDocument>,
  ) {}

  /**
   * Lấy ví hệ thống chính. Vì walletName unique + default sẵn,
   * collection chỉ nên có duy nhất 1 document này.
   */
  async findMainWallet(): Promise<SystemWallet | null> {
    return this.systemWalletModel
      .findOne({ walletName: MAIN_WALLET_NAME })
      .lean()
      .exec();
  }

  /**
   * Trừ tiền khỏi ví hệ thống khi trả thưởng/refund cho user.
   * Dùng $inc với số âm — atomic, không ảnh hưởng totalRevenue
   * (totalRevenue chỉ tăng, không giảm theo comment trong schema).
   */
  async decreaseBalance(
    amount: number,
    session?: ClientSession,
  ): Promise<SystemWallet | null> {
    return this.systemWalletModel
      .findOneAndUpdate(
        { walletName: MAIN_WALLET_NAME },
        { $inc: { balance: -amount } },
        { returnDocument: 'after', session },
      )
      .lean()
      .exec();
  }

  /**
   * Cộng tiền vào ví hệ thống khi thu (entry fee, commission, ...).
   * Tăng cả balance và totalRevenue.
   */
  async increaseBalance(
    amount: number,
    session?: ClientSession,
  ): Promise<SystemWallet | null> {
    return this.systemWalletModel
      .findOneAndUpdate(
        { walletName: MAIN_WALLET_NAME },
        { $inc: { balance: amount, totalRevenue: amount } },
        { returnDocument: 'after', session },
      )
      .lean()
      .exec();
  }
}
