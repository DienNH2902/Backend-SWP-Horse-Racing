import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RewardConditionType } from 'src/constants/rewardConditionTypeEnum.enum';
import { RewardType } from 'src/constants/rewardTypeEnum.enum';

export class CreateRewardDto {
  @ApiProperty({
    example: 'Khung Avatar Vàng',
    description: 'Tên của phần thưởng',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: RewardConditionType.SHOP,
    enum: RewardConditionType,
    description: 'Loại điều kiện (MILESTONE hoặc SHOP)',
  })
  @IsEnum(RewardConditionType)
  @IsNotEmpty()
  conditionType: RewardConditionType;

  @ApiProperty({
    example: 500,
    description: 'Mốc totalPoints cần đạt hoặc giá pointBalance cần trả',
  })
  @IsNumber()
  @Min(0)
  requiredValue: number;

  @ApiProperty({
    example: RewardType.BACKGROUND,
    enum: RewardType,
    description: 'Loại phần quà nhận được',
  })
  @IsEnum(RewardType)
  @IsNotEmpty()
  rewardType: RewardType;

  @ApiProperty({
    example: 'https://yourcdn.com/frames/golden_hoof.png',
    description: 'Giá trị phần quà (Số điểm cộng hoặc đường dẫn URL assets)',
  })
  @IsString()
  @IsNotEmpty()
  rewardValue: string;

  @ApiProperty({
    example: 'Khung viền mạ vàng bóng loáng đẳng cấp dành cho Spectator.',
    required: false,
    description: 'Mô tả chi tiết phần quà',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
