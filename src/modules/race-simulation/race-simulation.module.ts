import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Schemas
import { RaceTick, RaceTickSchema } from './schemas/race-tick.schema';
import { RaceEvent, RaceEventSchema } from './schemas/race-event.schema';
import {
  HorseRaceStats,
  HorseRaceStatsSchema,
} from './schemas/horse-race-stat.schema';

// Repositories (owned by this module)
import { RaceTickRepository } from './repositories/race-tick.repository';
import { RaceEventRepository } from './repositories/race-event.repository';
import { HorseRaceStatsRepository } from './repositories/horse-race-stat.repository';
import { RawResultRepository } from './repositories/raw-result.repository';

// Service + Controller
import { RaceSimulationService } from './race-simulation.service';
import { RaceSimulationController } from './race-simulation.controller';

// External modules cần import để lấy Repositories
// Đảm bảo các module này export Repository tương ứng
import { RaceModule } from '../race/race.module';
import { RaceCourseModule } from '../race/race-course/race-course.module';
import { RaceConditionModule } from '../race/race-condition/race-condition.module';
import { RegistrationModule } from '../registration/registration.module';

import { RawResult, RawResultSchema } from './schemas/raw-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RaceTick.name,       schema: RaceTickSchema       },
      { name: RaceEvent.name,      schema: RaceEventSchema      },
      { name: HorseRaceStats.name, schema: HorseRaceStatsSchema },
      { name: RawResult.name,      schema: RawResultSchema      },
    ]),

    // Import để inject Repository từ module khác
    RaceModule,
    RaceCourseModule,
    RaceConditionModule,
    RegistrationModule,
  ],
  controllers: [RaceSimulationController],
  providers: [
    RaceSimulationService,
    RaceTickRepository,
    RaceEventRepository,
    HorseRaceStatsRepository,
    RawResultRepository,
  ],
  exports: [
    RaceSimulationService,
    RaceTickRepository,
    RaceEventRepository,
  ],
})
export class RaceSimulationModule {}