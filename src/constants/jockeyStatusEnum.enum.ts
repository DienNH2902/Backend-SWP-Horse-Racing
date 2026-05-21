export enum JockeyStatusEnum {
  PENDING_APPROVAL = 'Pending_Approval', // Vừa đăng ký, chờ admin duyệt chứng chỉ/hồ sơ
  REJECTED = 'Rejected', // Hồ sơ/chứng chỉ không hợp lệ, bị admin từ chối
  AVAILABLE = 'Available', // Đã duyệt, sức khỏe tốt, sẵn sàng nhận lịch thi đấu
  BUSY = 'Busy', // Đang tham gia một giải đấu/trận đua cụ thể, không thể xếp lịch thêm
  RESTING = 'Resting', // Đang trong giai đoạn nghỉ ngơi (xin nghỉ phép, nghỉ giữa các mùa giải)
  INJURED = 'Injured', // Bị chấn thương (được cập nhật sau trận đấu hoặc do jockey báo cáo)
  BANNED = 'Banned', // Bị cấm thi đấu (do vi phạm quy chế, gian lận)
}
