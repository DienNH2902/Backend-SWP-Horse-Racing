import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Streak, StreakSchema } from './schemas/streak.schema';
import { StreakRepository } from './streak.repository';
import { StreakService } from './streak.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Streak.name, schema: StreakSchema }]),
  ],
  providers: [StreakService, StreakRepository],
  exports: [StreakService], // Export để sử dụng ở module khác
})
export class StreakModule {}
