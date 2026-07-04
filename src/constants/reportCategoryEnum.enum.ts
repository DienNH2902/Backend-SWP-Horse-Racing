export enum ReportCategory {
  MISSING_WINNING_POINTS = 'MISSING_WINNING_POINTS', // Không nhận được điểm khi cược thắng
  MISSING_COMPENSATION = 'MISSING_COMPENSATION', // Chưa nhận được tiền bồi thường
  UNAUTHORIZED_DEDUCTION = 'UNAUTHORIZED_DEDUCTION', // Bị trừ tiền không có transaction
  FROZEN_POINTS_NOT_REFUNDED = 'FROZEN_POINTS_NOT_REFUNDED', // Tiền đóng băng không được hoàn
  OTHER = 'OTHER', // Khác
}
