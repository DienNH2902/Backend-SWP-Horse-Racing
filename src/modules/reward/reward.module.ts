import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RewardController } from './reward.controller';
import { RewardService } from './reward.service';
import { RewardRepository } from './reward.repository';
import { Reward, RewardSchema } from './schemas/reward.schema';
import {
  SpectatorProfile,
  SpectatorProfileSchema,
} from '../user/schemas/spectator-profile.schema'; // Cập nhật đường dẫn thực tế của bạn
import {
  ClaimedReward,
  ClaimedRewardSchema,
} from './schemas/claimedReward.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reward.name, schema: RewardSchema },
      { name: ClaimedReward.name, schema: ClaimedRewardSchema },
      { name: SpectatorProfile.name, schema: SpectatorProfileSchema },
    ]),
  ],
  controllers: [RewardController],
  providers: [RewardService, RewardRepository],
  exports: [RewardService, RewardRepository],
})
export class RewardModule {}
