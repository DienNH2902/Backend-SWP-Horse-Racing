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
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RawResult.name, schema: RawResultSchema },
    ]),
    forwardRef(() => RaceModule),
    forwardRef(() => RefereeReportModule),
    forwardRef(() => TournamentModule),
    BetModule,
  ],
  controllers: [RawResultController],
  providers: [RawResultService, RawResultRepository],
  exports: [RawResultService, RawResultRepository],
})
export class RawResultModule {}
