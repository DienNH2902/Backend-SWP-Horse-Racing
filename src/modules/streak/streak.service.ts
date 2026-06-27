import { Injectable } from '@nestjs/common';
import { StreakRepository } from './streak.repository';
import { plainToInstance } from 'class-transformer';
import { ResponseStreakDto } from './dto/response-streak.dto';
import { Streak, StreakDocument } from './schemas/streak.schema';

@Injectable()
export class StreakService {
  constructor(private readonly streakRepository: StreakRepository) {}

  private getStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async trackLoginStreak(
    userId: string,
    fullName: string,
    email: string,
  ): Promise<ResponseStreakDto> {
    const today = this.getStartOfDay(new Date());
    const streak = await this.streakRepository.findByUserId(userId);

    let updatedCurrentStreak = 1;
    let updatedLongestStreak = 1;
    let isRewardAvailable = true;
    let shouldRewardPoints = false;

    // Trường hợp 1: Tài khoản mới hoàn toàn, chưa từng có dữ liệu chuỗi đăng nhập
    if (!streak) {
      shouldRewardPoints = true;
    } else {
      // Trường hợp 2: Đã tồn tại dữ liệu trước đó, tiến hành tính toán lại chỉ số chuỗi
      const lastLogin = this.getStartOfDay(streak.lastLoginDate);
      const diffTime = today.getTime() - lastLogin.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      updatedCurrentStreak = streak.currentStreak;
      updatedLongestStreak = streak.longestStreak;

      if (diffDays === 0) {
        // Trùng ngày đăng nhập cũ, giữ nguyên dữ liệu, không cộng điểm hằng ngày
        isRewardAvailable = false;
        shouldRewardPoints = false;
      } else if (diffDays === 1) {
        // Đăng nhập liên tiếp vào ngày kế tiếp thành công
        updatedCurrentStreak += 1;
        isRewardAvailable = true;
        shouldRewardPoints = true;
        if (updatedCurrentStreak > updatedLongestStreak) {
          updatedLongestStreak = updatedCurrentStreak;
        }
      } else {
        // Bị đứt chuỗi (diffDays > 1), reset chuỗi về ngày đầu tiên
        updatedCurrentStreak = 1;
        isRewardAvailable = true;
        shouldRewardPoints = true;
      }
    }

    // Xử lý cộng điểm vào Hồ sơ Spectator nếu thỏa mãn điều kiện sang ngày mới
    if (shouldRewardPoints) {
      await this.streakRepository.rewardDailyPoints(userId, 10);
    }

    // Tiến hành đẩy xuống DB xử lý cập nhật trạng thái chuỗi đăng nhập
    const updatedStreak = await this.streakRepository.updateStreak(userId, {
      fullName,
      email,
      currentStreak: updatedCurrentStreak,
      longestStreak: updatedLongestStreak,
      lastLoginDate: today,
    });

    if (!updatedStreak) {
      throw new Error(
        'Không thể cập nhật hoặc khởi tạo chuỗi đăng nhập Streak.',
      );
    }

    return this.toResponseDto(updatedStreak, isRewardAvailable);
  }

  async getStreak(userId: string): Promise<ResponseStreakDto> {
    const streak = await this.streakRepository.findByUserId(userId);
    if (!streak) {
      return {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastLoginDate: null,
        isRewardAvailable: true,
      } as unknown as ResponseStreakDto;
    }

    const today = this.getStartOfDay(new Date());
    const lastLogin = this.getStartOfDay(streak.lastLoginDate);
    const diffTime = today.getTime() - lastLogin.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const currentStreakShow = diffDays > 1 ? 0 : streak.currentStreak;

    return {
      userId: streak.userId.toString(),
      fullName: streak.fullName,
      email: streak.email,
      currentStreak: currentStreakShow,
      longestStreak: streak.longestStreak,
      lastLoginDate: streak.lastLoginDate,
      isRewardAvailable: diffDays > 0,
    } as unknown as ResponseStreakDto;
  }

  private toResponseDto(
    streak: StreakDocument,
    isRewardAvailable: boolean,
  ): ResponseStreakDto {
    const plain = streak.toObject<Streak>();

    return plainToInstance(
      ResponseStreakDto,
      { ...plain, isRewardAvailable },
      { excludeExtraneousValues: true },
    );
  }
}
