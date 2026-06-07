import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  RefereeReport,
  RefereeReportSchema,
} from './schemas/referee-report.schema';
import { RefereeReportRepository } from './referee-report.repository';
import { RefereeReportService } from './referee-report.service';
import { RefereeReportController } from './referee-report.controller';
import { RaceModule } from '../race/race.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RefereeReport.name, schema: RefereeReportSchema },
    ]),
    forwardRef(() => RaceModule), // forwardRef để tránh circular dependency
  ],
  controllers: [RefereeReportController],
  providers: [RefereeReportRepository, RefereeReportService],
  exports: [RefereeReportService, RefereeReportRepository],
})
export class RefereeReportModule {}