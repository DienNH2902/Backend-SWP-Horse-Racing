export enum TournamentStatusEnum {
  PREPARING = 'Preparing', // Đang chuẩn bị, chưa mở đăng ký
  REGISTRATION = 'Registration', // Đang mở đăng ký cho Horse Owner & Jockey
  UPCOMING = 'Upcoming', // Đã đóng đăng ký, chờ ngày khai mạc
  ON_GOING = 'Ongoing', // Giải đấu đang diễn ra
  COMPLETED = 'Completed', // Giải đấu đã kết thúc
  CANCELED = 'Canceled', // Giải đấu bị hủy bỏ
}

export const TOURNAMENT_TOTAL_ROUNDS = 2;
