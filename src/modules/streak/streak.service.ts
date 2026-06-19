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
  async trackLoginStreak(
    userId: string,
    fullName: string,
    email: string,
  ): Promise<ResponseStreakDto> {
    const today = this.getStartOfDay(new Date());
    let streak = await this.streakRepository.findByUserId(userId);

    // Trường hợp 1: User chưa từng có dữ liệu streak
    if (!streak) {
      try {
        const newStreak = await this.streakRepository.createStreak({
          userId: userId,
          fullName,
          email,
          currentStreak: 1,
          longestStreak: 1,
          lastLoginDate: today,
        } as any);

        return this.toResponseDto(newStreak, true);
      } catch (error: any) {
        // Nếu dính lỗi ghi trùng lặp bản ghi do 2 request chạy song song
        if (error.code === 11000) {
          // Lấy lại bản ghi vừa được tạo bởi request song song kia
          streak = await this.streakRepository.findByUserId(userId);
        } else {
          throw error;
        }
      }
    }

    // Nếu không dính lỗi hoặc nhảy vào khối catch lấy được streak cũ
    const lastLogin = this.getStartOfDay(streak!.lastLoginDate); // Thêm dấu ! ở đây phòng trường hợp TS báo lỗi null
    const diffTime = today.getTime() - lastLogin.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let updatedCurrentStreak = streak!.currentStreak;
    let updatedLongestStreak = streak!.longestStreak;
    let isRewardAvailable = false;

    if (diffDays === 0) {
      isRewardAvailable = false;
    } else if (diffDays === 1) {
      updatedCurrentStreak += 1;
      isRewardAvailable = true;

      if (updatedCurrentStreak > updatedLongestStreak) {
        updatedLongestStreak = updatedCurrentStreak;
      }
    } else {
      updatedCurrentStreak = 1;
      isRewardAvailable = true;
    }

    streak = await this.streakRepository.updateStreak(userId, {
      fullName,
      email,
      currentStreak: updatedCurrentStreak,
      longestStreak: updatedLongestStreak,
      lastLoginDate: today,
    });

    if (!streak) {
      throw new Error('Không thể cập nhật hoặc ghi nhận chuỗi đăng nhập.');
    }

    return this.toResponseDto(streak, isRewardAvailable);
  }

  // Lấy trạng thái Streak hiện tại của user (Xem thông tin)
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
      fullName: streak.fullName,
      email: streak.email,
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
