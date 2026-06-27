import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { RewardRepository } from './reward.repository';
import { RewardConditionType } from 'src/constants/rewardConditionTypeEnum.enum';
import { RewardType } from 'src/constants/rewardTypeEnum.enum';
import { CreateRewardDto } from './dto/create-reward.dto';
import { ResponseRewardDto } from './dto/response-reward.dto';
import { plainToInstance } from 'class-transformer';
import { PointsTransactionType } from 'src/constants/pointsTransactionTypeEnum.enum';
import { PointsTransactionService } from '../points-transaction/points-transaction.service';

@Injectable()
export class RewardService {
  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly pointsTransactionService: PointsTransactionService,
  ) {}

  private toResponse(data: any) {
    return plainToInstance(ResponseRewardDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async createReward(dto: CreateRewardDto): Promise<ResponseRewardDto> {
    const existing = await this.rewardRepository.findOneReward({
      title: dto.title,
    });
    if (existing) throw new ConflictException('Tên phần thưởng đã tồn tại');

    const reward = await this.rewardRepository.createReward(dto);
    return this.toResponse(reward);
  }

  async findAllRewards(): Promise<ResponseRewardDto[]> {
    const rewards = await this.rewardRepository.findAllRewards();
    return rewards.map((r) => this.toResponse(r));
  }

  async findOneReward(id: string): Promise<ResponseRewardDto> {
    const reward = await this.rewardRepository.findOneReward({ _id: id });
    if (!reward) throw new NotFoundException('Không tìm thấy phần thưởng');
    return this.toResponse(reward);
  }

  async updateReward(
    id: string,
    dto: Partial<CreateRewardDto>,
  ): Promise<ResponseRewardDto> {
    // 1. Kiểm tra phần thưởng có tồn tại trong hệ thống hay không
    const reward = await this.rewardRepository.findRewardById(id);
    if (!reward)
      throw new NotFoundException('Không tìm thấy phần thưởng để cập nhật');

    // 2. Nếu có đổi tên (title), kiểm tra xem tên mới có bị trùng với bản ghi khác không
    if (dto.title && dto.title !== reward.title) {
      const existing = await this.rewardRepository.findOneReward({
        title: dto.title,
      });
      if (existing)
        throw new ConflictException(
          'Tên phần thưởng này đã tồn tại trên hệ thống',
        );
    }

    // 3. Tiến hành cập nhật
    const updatedReward = await this.rewardRepository.updateReward(id, dto);
    return this.toResponse(updatedReward);
  }

  // 1. Trả về Dashboard danh sách toàn bộ quà kèm trạng thái cá nhân hóa của User
  async getRewardsDashboard(userId: string) {
    const allRewards = await this.rewardRepository.findAllRewards();
    const userClaims = await this.rewardRepository.findClaimsByUserId(userId);
    const claimedRewardIds = new Set(
      userClaims.map((c) => c.rewardId._id.toString()),
    );

    const profile = await this.rewardRepository.findSpectatorProfile(userId);
    const currentTotalPoints = profile ? profile.totalPoints : 0;
    const currentPointBalance = profile ? profile.pointBalance : 0;

    return allRewards.map((reward) => {
      const rewardIdStr = reward._id.toString();
      const isClaimed = claimedRewardIds.has(rewardIdStr);
      let isAvailable = false;

      // Nếu chưa nhận/mua, tiến hành check điều kiện
      if (!isClaimed) {
        if (reward.conditionType === RewardConditionType.MILESTONE) {
          isAvailable = currentTotalPoints >= reward.requiredValue;
        } else if (reward.conditionType === RewardConditionType.SHOP) {
          isAvailable = currentPointBalance >= reward.requiredValue;
        }
      }

      return {
        id: rewardIdStr,
        title: reward.title,
        conditionType: reward.conditionType,
        requiredValue: reward.requiredValue,
        rewardType: reward.rewardType,
        rewardValue: reward.rewardValue,
        description: reward.description,
        isClaimed,
        isAvailable,
      };
    });
  }

  // 2. Hàm xử lý gộp nhận quà MILESTONE hoặc Mua quà từ SHOP
  async processClaimReward(userId: string, rewardId: string) {
    const reward = await this.rewardRepository.findRewardById(rewardId);
    if (!reward)
      throw new NotFoundException('Phần thưởng hoặc vật phẩm không tồn tại.');

    // Kiểm tra xem đã sở hữu/nhận chưa
    const alreadyClaimed = await this.rewardRepository.findClaimedRecord(
      userId,
      rewardId,
    );
    if (alreadyClaimed)
      throw new BadRequestException(
        'Bạn đã sở hữu hoặc nhận phần thưởng này rồi.',
      );

    const profile = await this.rewardRepository.findSpectatorProfile(userId);
    if (!profile)
      throw new NotFoundException(
        'Không tìm thấy hồ sơ Spectator của người dùng này.',
      );

    let currentBalance = profile.pointBalance;

    // Phân nhánh kiểm tra điều kiện dựa trên thể loại quà
    if (reward.conditionType === RewardConditionType.MILESTONE) {
      if (profile.totalPoints < reward.requiredValue) {
        throw new BadRequestException(
          `Chưa đạt mốc tổng điểm tích lũy yêu cầu.`,
        );
      }
    } else if (reward.conditionType === RewardConditionType.SHOP) {
      if (profile.pointBalance < reward.requiredValue) {
        throw new BadRequestException(
          'Số dư điểm không đủ để đổi vật phẩm này.',
        );
      }

      // 1. Tiến hành trừ điểm ví pointBalance ngay lập tức
      await this.rewardRepository.deductPointBalance(
        userId,
        reward.requiredValue,
      );
      currentBalance -= reward.requiredValue;

      // 2. Ghi nhận giao dịch SPEND (Trừ điểm do mua đồ trong SHOP)
      await this.pointsTransactionService.logTransaction({
        userId,
        type: PointsTransactionType.SPEND,
        amount: reward.requiredValue,
        balanceAfter: currentBalance,
        reason: `Mua vật phẩm: ${reward.title}`,
        rewardId: rewardId,
      });
    }

    // Ghi nhận lịch sử đã nhận quà thành công vào DB
    await this.rewardRepository.createClaimRecord(userId, rewardId);

    // Áp dụng hiệu ứng/phần quà trực tiếp lên tài khoản người chơi
    if (reward.rewardType === RewardType.POINTS) {
      const cleanValue = reward.rewardValue.replace(/[^\d]/g, '');
      const addedPoints = parseInt(cleanValue, 10);

      if (!isNaN(addedPoints) && addedPoints > 0) {
        // 1. Cộng điểm vào tài khoản
        await this.rewardRepository.bonusPoints(userId, addedPoints);
        currentBalance += addedPoints;

        // 2. Ghi nhận giao dịch EARN (Cộng điểm từ phần thưởng)
        await this.pointsTransactionService.logTransaction({
          userId,
          type: PointsTransactionType.EARN,
          amount: addedPoints,
          balanceAfter: currentBalance,
          reason: `Nhận điểm từ phần thưởng: ${reward.title}`,
          rewardId: rewardId,
        });
      } else {
        console.warn(
          `[RewardService] Không thể convert rewardValue dạng số cho phần thưởng: ${reward.title}`,
        );
      }
    }

    return {
      message:
        reward.conditionType === RewardConditionType.SHOP
          ? 'Đổi vật phẩm thành công.'
          : 'Nhận mốc thưởng thành công.',
      rewardTitle: reward.title,
      rewardType: reward.rewardType,
      rewardValue: reward.rewardValue,
    };
  }

  // 3. API dành riêng cho FE Get thông tin cấu hình hiển thị Profile (Khung, Nền, Thẻ) đã mở khóa
  async getUnlockedAssets(userId: string) {
    const claims = await this.rewardRepository.findClaimsByUserId(userId);

    const unlockedFrames = claims
      .filter((c) => (c.rewardId as any).rewardType === RewardType.AVATAR_FRAME)
      .map((c) => (c.rewardId as any).rewardValue);

    const unlockedBackgrounds = claims
      .filter((c) => (c.rewardId as any).rewardType === RewardType.BACKGROUND)
      .map((c) => (c.rewardId as any).rewardValue);

    const insuranceCardsCount = claims.filter(
      (c) => (c.rewardId as any).rewardType === RewardType.INSURANCE_CARD,
    ).length;

    return {
      frames: unlockedFrames,
      backgrounds: unlockedBackgrounds,
      hasInsuranceCard: insuranceCardsCount > 0,
      insuranceCardsCount,
    };
  }
}
