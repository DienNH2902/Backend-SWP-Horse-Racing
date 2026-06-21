import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { RewardConditionType } from 'src/constants/rewardConditionTypeEnum.enum';
import { RewardType } from 'src/constants/rewardTypeEnum.enum';

export class ResponseRewardDto {
  @ApiProperty({ example: '667563ca2f33c3aa3282b111' })
  @Transform(({ obj }) => obj._id?.toString())
  @Expose()
  id: string;

  @ApiProperty({ example: 'Khung Avatar Vàng' })
  @Expose()
  title: string;

  @ApiProperty({ enum: RewardConditionType })
  @Expose()
  conditionType: RewardConditionType;

  @ApiProperty({ example: 500 })
  @Expose()
  requiredValue: number;

  @ApiProperty({ enum: RewardType })
  @Expose()
  rewardType: RewardType;

  @ApiProperty({ example: 'https://yourcdn.com/frames/golden.png' })
  @Expose()
  rewardValue: string;

  @ApiProperty({ example: 'Khung viền mạ vàng bóng loáng đẳng cấp' })
  @Expose()
  description: string;
}
