export enum RaceStatusEnum {
  SCHEDULED = 'Scheduled', // đã tạo, chờ diễn ra
  ONGOING = 'Ongoing', // đang chạy
  FINISHED = 'Finished', // xong, có kết quả thô
  CANCELLED = 'Cancelled', // huỷ
  READY = 'Ready', // referee đã confirm all clear, sẵn sàng simulate
  SIMULATED = 'Simulated', // engine đã chạy xong, betting bị lock
}
