import { Expose, Transform } from 'class-transformer';

export class ResponseStreakDto {
  @Expose()
  @Transform(({ value }) => value?.toString())
  userId: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string;

  @Expose()
  currentStreak: number;

  @Expose()
  longestStreak: number;

  @Expose()
  lastLoginDate: Date | null;

  @Expose()
  isRewardAvailable: boolean; // Trạng thái để FE biết hôm nay đã nhận thưởng/điểm danh chưa
}
