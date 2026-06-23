// src/constants/notificationType.enum.ts

export enum NotificationTypeEnum {
  // --- Hệ thống tài chính (Wallet / Payment) ---
  DEPOSIT_SUCCESS = 'Deposit_success',
  DEPOSIT_FAILED = 'Deposit_failed',
  WITHDRAW_SUCCESS = 'Withdraw_success',
  WITHDRAW_FAILED = 'Withdraw_failed',
  CONTRACT_PAID = 'Contract_paid', // Chủ ngựa bị trừ tiền thanh toán hợp đồng
  REWARD_RECEIVED = 'Reward_received', // Nài ngựa nhận được tiền thưởng giải đấu

  // --- Hệ thống giao kèo / Thư mời (Invitation / Contract) ---
  INVITATION_RECEIVED = 'Invitation_received', // Nài ngựa nhận được lời mời mới
  INVITATION_ACCEPTED = 'Invitation_accepted', // Chủ ngựa nhận thông báo nài đã đồng ý
  INVITATION_REJECTED = 'Invitation_rejected', // Chủ ngựa nhận thông báo nài đã từ chối
  CONTRACT_CANCELLED = 'Contract_cancelled', // Hợp đồng bị hủy bỏ
  CONTRACT_BREACHED = 'Contract_breached', // Hợp đồng bị vi phạm
  CONTRACT_COMPLETED = 'Contract_completed', // Hợp đồng hoàn thành tốt đẹp

  // --- Hệ thống giải đấu / Vận hành (Tournament) ---
  TOURNAMENT_REGISTERED = 'Tournament_registered', // Đăng ký giải đấu thành công
  TOURNAMENT_WAITLIST = 'Tournament_waitlist',
  TOURNAMENT_REJECTED = 'Tournament_rejected',
  RACE_REMINDER = 'Race_reminder', // Nhắc nhở lịch đua sắp diễn ra
  JOCKEY_INJURED = 'Jockey_injured', // Cảnh báo nài gặp chấn thương (gửi ban tổ chức/chủ ngựa)

  // --- Tài khoản hệ thống (Account) ---
  ACCOUNT_LOCKED = 'Account_locked',
  PROFILE_VERIFIED = 'Profile_verified',
  BALANCE_NOT_ENOUGH = 'Balance_not_enough',

  // Hệ thống
  SYSTEM_ALERT = 'System_alert',
}
