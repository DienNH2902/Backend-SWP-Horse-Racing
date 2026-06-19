import { Injectable } from '@nestjs/common';
import { StreakRepository } from './streak.repository';
import { plainToInstance } from 'class-transformer';
import { ResponseStreakDto } from './dto/response-streak.dto';
import { Streak, StreakDocument } from './schemas/streak.schema';

@Injectable()
export class StreakService {
  constructor(private readonly streakRepository: StreakRepository) {}

  // Hàm bổ trợ đưa ngày về mốc 00:00:00 để so sánh chuẩn xác theo ngày
  private getStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Logic xử lý điểm danh/đăng nhập mỗi ngày để cập nhật Streak
  async trackLoginStreak(userId: string): Promise<ResponseStreakDto> {
    const today = this.getStartOfDay(new Date());
    let streak = await this.streakRepository.findByUserId(userId);

    // Trường hợp 1: User chưa từng có dữ liệu streak (Đăng nhập lần đầu hệ thống có tính năng này)
    if (!streak) {
      const newStreak = await this.streakRepository.createStreak({
        userId: userId, // Tự động ép kiểu trong DB sang ObjectId
        currentStreak: 1,
        longestStreak: 1,
        lastLoginDate: today,
      } as any);

      return this.toResponseDto(newStreak, true);
    }

    const lastLogin = this.getStartOfDay(streak.lastLoginDate);

    // Tính toán khoảng cách ngày (đơn vị: mili-giây đổi ra ngày)
    const diffTime = today.getTime() - lastLogin.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let updatedCurrentStreak = streak.currentStreak;
    let updatedLongestStreak = streak.longestStreak;
    let isRewardAvailable = false;

    if (diffDays === 0) {
      // Trường hợp 2: Hôm nay đã đăng nhập rồi, không tăng streak nữa
      isRewardAvailable = false;
    } else if (diffDays === 1) {
      // Trường hợp 3: Đăng nhập liên tiếp (cách hôm qua đúng 1 ngày)
      updatedCurrentStreak += 1;
      isRewardAvailable = true;

      if (updatedCurrentStreak > updatedLongestStreak) {
        updatedLongestStreak = updatedCurrentStreak;
      }
    } else {
      // Trường hợp 4: Bị đứt chuỗi (quá 1 ngày không đăng nhập)
      updatedCurrentStreak = 1;
      isRewardAvailable = true;
    }

    // Cập nhật lại vào cơ sở dữ liệu nếu có sự thay đổi ngày đăng nhập mới
    if (diffDays > 0) {
      streak = await this.streakRepository.updateStreak(userId, {
        currentStreak: updatedCurrentStreak,
        longestStreak: updatedLongestStreak,
        lastLoginDate: today,
      });
    }

    if (!streak) {
      throw new Error('Không thể cập nhật hoặc ghi nhận chuỗi đăng nhập.');
    }

    return this.toResponseDto(streak, isRewardAvailable);
  }

  /**
   * Lấy trạng thái Streak hiện tại của user (Xem thông tin)
   */
  async getStreak(userId: string): Promise<ResponseStreakDto> {
    const streak = await this.streakRepository.findByUserId(userId);
    if (!streak) {
      return {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastLoginDate: null,
        isRewardAvailable: true,
      } as ResponseStreakDto;
    }

    const today = this.getStartOfDay(new Date());
    const lastLogin = this.getStartOfDay(streak.lastLoginDate);
    const diffTime = today.getTime() - lastLogin.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Nếu qua hơn 1 ngày không vào, hiển thị trực quan là chuỗi hiện tại đã về 0
    const currentStreakShow = diffDays > 1 ? 0 : streak.currentStreak;

    return {
      userId: streak.userId.toString(),
      currentStreak: currentStreakShow,
      longestStreak: streak.longestStreak,
      lastLoginDate: streak.lastLoginDate,
      isRewardAvailable: diffDays > 0,
    };
  }

  private toResponseDto(
    streak: StreakDocument,
    isRewardAvailable: boolean,
  ): ResponseStreakDto {
    // Chuyển đổi sang object thuần một cách an toàn thông qua method có sẵn của Mongoose Document
    const plain = streak.toObject<Streak>();

    return plainToInstance(
      ResponseStreakDto,
      { ...plain, isRewardAvailable },
      { excludeExtraneousValues: true },
    );
  }
}
