import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemWalletRepository } from './system-wallet.repository';
import {
  Transaction,
  TransactionDocument,
} from '../payment/schemas/transaction.schema';
import {
  MonthlyRevenueDto,
  RevenueSourceDto,
  SystemWalletOverviewDto,
} from './dto/system-wallet.dto';
import { TransactionTypeEnum } from 'src/constants/transactionType.enum';

interface AggregateSourceResult {
  _id: string; // TransactionTypeEnum.ENTRY_FEE | TransactionTypeEnum.PENALTY
  totalAmount: number;
  totalSystemCommission: number;
}

interface AggregateMonthlyResult {
  _id: {
    year: number;
    month: number;
    type: string;
  };
  monthlyAmount: number;
  monthlyCommission: number;
}

@Injectable()
export class SystemWalletService {
  constructor(
    private readonly systemWalletRepository: SystemWalletRepository,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  /**
   * Tổng hợp chi tiết số dư, lũy kế, nguồn thu và dữ liệu cho biểu đồ cột
   */
  async getSystemWalletOverview(): Promise<SystemWalletOverviewDto> {
    const mainWallet = await this.systemWalletRepository.findMainWallet();

    if (!mainWallet) {
      throw new NotFoundException('Ví hệ thống chưa được khởi tạo!');
    }

    const [revenueBreakdown, monthlyChartData] = await Promise.all([
      this.getRevenueBreakdown(),
      this.getMonthlyRevenueChart(),
    ]);

    return {
      _id: mainWallet._id.toString(),
      walletName: mainWallet.walletName,
      balance: mainWallet.balance,
      totalRevenue: mainWallet.totalRevenue,
      revenueBreakdown,
      monthlyChartData,
    };
  }

  /**
   * Tính toán phân rã doanh thu thực tế thu về theo loại giao dịch
   */
  private async getRevenueBreakdown(): Promise<RevenueSourceDto> {
    const sources =
      await this.transactionModel.aggregate<AggregateSourceResult>([
        {
          $match: {
            type: {
              $in: [TransactionTypeEnum.ENTRY_FEE, TransactionTypeEnum.PENALTY],
            },
          },
        },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            totalSystemCommission: {
              $sum: {
                $cond: [
                  { $eq: ['$type', TransactionTypeEnum.PENALTY] },
                  { $multiply: ['$amount', 0.1] },
                  '$amount',
                ],
              },
            },
          },
        },
      ]);

    let entryFeeRevenue = 0;
    let penaltyCommissionRevenue = 0;

    for (const item of sources) {
      if (item._id === TransactionTypeEnum.ENTRY_FEE.toString()) {
        entryFeeRevenue = item.totalAmount;
      } else if (item._id === TransactionTypeEnum.PENALTY.toString()) {
        penaltyCommissionRevenue = item.totalSystemCommission;
      }
    }

    return {
      entryFeeRevenue,
      penaltyCommissionRevenue,
    };
  }

  /**
   * Gom nhóm doanh thu theo từng tháng phục vụ biểu đồ cột (Bar Chart)
   */
  private async getMonthlyRevenueChart(): Promise<MonthlyRevenueDto[]> {
    const monthlyData =
      await this.transactionModel.aggregate<AggregateMonthlyResult>([
        {
          $match: {
            type: {
              $in: [TransactionTypeEnum.ENTRY_FEE, TransactionTypeEnum.PENALTY],
            },
          },
        },
        {
          $project: {
            type: 1,
            amount: 1,
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
        },
        {
          $group: {
            _id: {
              year: '$year',
              month: '$month',
              type: '$type',
            },
            monthlyAmount: { $sum: '$amount' },
            monthlyCommission: {
              $sum: {
                $cond: [
                  { $eq: ['$type', TransactionTypeEnum.PENALTY] },
                  { $multiply: ['$amount', 0.1] },
                  '$amount',
                ],
              },
            },
          },
        },
        {
          $sort: {
            '_id.year': 1,
            '_id.month': 1,
          },
        },
      ]);

    const monthlyMap = new Map<
      string,
      { entryFee: number; penaltyCommission: number }
    >();

    for (const item of monthlyData) {
      const yearStr = item._id.year.toString();
      const monthStr = item._id.month.toString().padStart(2, '0');
      const key = `${yearStr}-${monthStr}`;

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { entryFee: 0, penaltyCommission: 0 });
      }

      const current = monthlyMap.get(key)!;

      if (item._id.type === TransactionTypeEnum.ENTRY_FEE.toString()) {
        current.entryFee += item.monthlyAmount;
      } else if (item._id.type === TransactionTypeEnum.PENALTY.toString()) {
        current.penaltyCommission += item.monthlyCommission;
      }
    }

    const result: MonthlyRevenueDto[] = [];
    monthlyMap.forEach((val, key) => {
      result.push({
        month: key,
        entryFee: val.entryFee,
        penaltyCommission: val.penaltyCommission,
        totalMonthlyRevenue: val.entryFee + val.penaltyCommission,
      });
    });

    return result;
  }
}
