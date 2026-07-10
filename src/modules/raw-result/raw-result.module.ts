import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RawResult, RawResultSchema } from './schemas/raw-result.schema';
import { RawResultRepository } from './raw-result.repository';
import { RawResultService } from './raw-result.service';
import { RawResultController } from './raw-result.controller';
import { RaceModule } from '../race/race.module';
import { RefereeReportModule } from '../referee-report/referee-report.module';
import { TournamentModule } from '../tournament/tournament.module';
import { BetModule } from '../bet/bet.module';
import { HorseModule } from '../horse/horse.module';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';
import {
  SpectatorProfile,
  SpectatorProfileSchema,
} from '../user/schemas/spectator-profile.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RawResult.name, schema: RawResultSchema },
      { name: SpectatorProfile.name, schema: SpectatorProfileSchema },
    ]),
    forwardRef(() => RaceModule),
    forwardRef(() => RefereeReportModule),
    forwardRef(() => TournamentModule),
    BetModule,
    HorseModule,
    UserModule,
    NotificationModule,
  ],
  controllers: [RawResultController],
  providers: [RawResultService, RawResultRepository],
  exports: [RawResultService, RawResultRepository],
})
export class RawResultModule {}
