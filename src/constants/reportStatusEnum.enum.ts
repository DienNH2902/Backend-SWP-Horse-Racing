export enum ReportStatus {
  PENDING = 'PENDING', // Đang chờ xử lý
  INVESTIGATING = 'INVESTIGATING', // Đang xác minh, điều tra
  RESOLVED = 'RESOLVED', // Đã giải quyết thành công
  REJECTED = 'REJECTED', // Bị từ chối (báo cáo sai sự thật)
}
