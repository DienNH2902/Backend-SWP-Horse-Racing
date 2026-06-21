import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Streak, StreakSchema } from './schemas/streak.schema';
import { StreakRepository } from './streak.repository';
import { StreakService } from './streak.service';
import { StreakController } from './streak.controller';
import {
  SpectatorProfile,
  SpectatorProfileSchema,
} from '../user/schemas/spectator-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Streak.name, schema: StreakSchema },
      { name: SpectatorProfile.name, schema: SpectatorProfileSchema },
    ]),
  ],
  controllers: [StreakController],
  providers: [StreakService, StreakRepository],
  exports: [StreakService], // Export để sử dụng ở module khác
})
export class StreakModule {}
