// src/bet/dto/response-bet.dto.ts
import { Expose, Transform } from 'class-transformer';

export class ResponseBetDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string; // Đổi sang id cho đồng bộ với Frontend của bạn

  @Expose()
  @Transform(({ obj }) => {
    if (!obj.spectatorId) return 'N/A';
    // Nếu spectatorId đã bị biến đổi thành object sau khi populate thành công
    if (typeof obj.spectatorId === 'object') {
      return obj.spectatorId._id?.toString() || 'N/A';
    }
    // Nếu chưa được populate (vẫn là chuỗi gốc)
    return obj.spectatorId.toString();
  })
  spectatorId: string;

  @Expose()
  @Transform(({ obj }) => {
    // Truy cập chuỗi liên kết: obj.spectatorId -> userId -> fullName
    if (
      obj.spectatorId &&
      typeof obj.spectatorId === 'object' &&
      obj.spectatorId.userId &&
      typeof obj.spectatorId.userId === 'object'
    ) {
      return obj.spectatorId.userId.fullName || 'N/A';
    }
    return 'N/A';
  })
  spectatorName: string;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.raceId && typeof obj.raceId === 'object') {
      return obj.raceId._id?.toString();
    }
    return obj.raceId?.toString();
  })
  raceId: string;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.raceId && typeof obj.raceId === 'object') {
      return obj.raceId.name || obj.raceId.title || 'N/A';
    }
    return 'N/A';
  })
  raceName: string; // Thêm trường này cho FE đỡ phải tự map từ ID

  @Expose()
  @Transform(({ obj }) => {
    if (obj.horseId && typeof obj.horseId === 'object') {
      return obj.horseId._id?.toString();
    }
    return obj.horseId?.toString();
  })
  horseId: string;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.horseId && typeof obj.horseId === 'object') {
      return obj.horseId.name || 'N/A';
    }
    return 'N/A';
  })
  horseName: string; // Thêm trường này để lấy tên Ngựa

  @Expose()
  horseWinRateAtBet: number;

  @Expose()
  bettorsOnHorseAtBet: number;

  @Expose()
  totalBettorsAtBet: number;

  @Expose()
  finalOdds: number;

  @Expose()
  pointsWagered: number;

  @Expose()
  pointsWon: number;

  @Expose()
  result: string;

  @Expose()
  placedAt: Date;
}
