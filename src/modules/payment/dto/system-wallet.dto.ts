import { ApiProperty } from '@nestjs/swagger';

export class RevenueSourceDto {
  @ApiProperty({
    example: 15000000,
    description: 'Tổng doanh thu từ phí tham gia giải đấu (Entry Fee)',
  })
  entryFeeRevenue: number;

  @ApiProperty({
    example: 3500000,
    description: 'Tổng doanh thu từ 10% hoa hồng vi phạm hợp đồng (Penalty)',
  })
  penaltyCommissionRevenue: number;
}

export class MonthlyRevenueDto {
  @ApiProperty({ example: '2026-07', description: 'Tháng thống kê (YYYY-MM)' })
  month: string;

  @ApiProperty({
    example: 5000000,
    description: 'Doanh thu từ phí tham gia trong tháng',
  })
  entryFee: number;

  @ApiProperty({
    example: 1200000,
    description: 'Doanh thu từ 10% hoa hồng vi phạm trong tháng',
  })
  penaltyCommission: number;

  @ApiProperty({
    example: 6200000,
    description: 'Tổng doanh thu thu về trong tháng',
  })
  totalMonthlyRevenue: number;
}

export class SystemWalletOverviewDto {
  @ApiProperty({
    example: '660000000000000000000001',
    description: 'ID ví hệ thống',
  })
  _id: string;

  @ApiProperty({ example: 'SYSTEM_MAIN_WALLET' })
  walletName: string;

  @ApiProperty({ example: 25000000, description: 'Số dư ví khả dụng hiện tại' })
  balance: number;

  @ApiProperty({ example: 18500000, description: 'Tổng doanh thu lũy kế' })
  totalRevenue: number;

  @ApiProperty({
    type: RevenueSourceDto,
    description: 'Phân rã doanh thu theo từng nguồn thu',
  })
  revenueBreakdown: RevenueSourceDto;

  @ApiProperty({
    type: [MonthlyRevenueDto],
    description: 'Thống kê chi tiết doanh thu theo tháng phục vụ biểu đồ',
  })
  monthlyChartData: MonthlyRevenueDto[];
}
