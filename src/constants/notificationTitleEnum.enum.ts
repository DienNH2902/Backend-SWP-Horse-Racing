// src/constants/notificationTitle.enum.ts

export enum NotificationTitleEnum {
  DEPOSIT_SUCCESS = 'Nạp tiền thành công',
  DEPOSIT_FAILED = 'Nạp tiền thất bại',
  CREATE_WITHDRAW_SUCCESS = 'Tạo đơn rút tiền thành công',
  WITHDRAW_SUCCESS = 'Rút tiền thành công',
  WITHDRAW_FAILED = 'Rút tiền thất bại',

  INVITATION_RECEIVED = 'Lời mời hợp tác mới',
  INVITATION_ACCEPTED = 'Lời mời đã được chấp nhận',
  INVITATION_REJECTED = 'Lời mời đã bị từ chối',

  TOURNAMENT_REGISTERED = 'Đăng ký giải đấu thành công',
  TOURNAMENT_WAITLIST = 'Bạn đã được chuyển vào phòng chờ',
  TOURNAMENT_REJECTED = 'Đăng ký giải đấu bị từ chối',
  RACE_REMINDER = 'Nhắc nhở lịch thi đấu',
  REWARD_RECEIVED = 'Phần thưởng giải đấu',
  CONTRACT_BREACHED = 'Hợp đồng đã vi phạm',
  CONTRACT_COMPLETED = 'Hợp đồng đã hoàn thành tốt đẹp',

  BALANCE_NOT_ENOUGH = 'Số dư tài khoản không đủ',

  SYSTEM_ALERT = 'Thông báo hệ thống',

  PLACE_BET_SUCCESS = 'Đặt cược thành công',
  UPDATE_BET_SUCCESS = 'Thay đổi cược thành công',
  BET_WIN = 'Chúc mừng thắng cược',
  BET_LOSE = 'Kết quả đặt cược',
  REFUND = 'Hoàn lại điểm cược',
}
