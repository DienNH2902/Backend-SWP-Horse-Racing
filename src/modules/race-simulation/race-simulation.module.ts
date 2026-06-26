import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Schemas
import { RaceTick, RaceTickSchema } from './schemas/race-tick.schema';
import { RaceEvent, RaceEventSchema } from './schemas/race-event.schema';
import {
  HorseRaceStats,
  HorseRaceStatsSchema,
} from './schemas/horse-race-stat.schema';

import { RaceTickRepository } from './repositories/race-tick.repository';
import { RaceEventRepository } from './repositories/race-event.repository';
import { HorseRaceStatsRepository } from './repositories/horse-race-stat.repository';
import { RawResultRepository } from './repositories/raw-result.repository';

import { RaceSimulationService } from './race-simulation.service';
import { RaceSimulationController } from './race-simulation.controller';

import { RaceModule } from '../race/race.module';
import { RaceCourseModule } from '../race/race-course/race-course.module';
import { RaceConditionModule } from '../race/race-condition/race-condition.module';
import { RegistrationModule } from '../registration/registration.module';
import { UserModule } from '../user/user.module';

import { RawResult, RawResultSchema } from '../raw-result/schemas/raw-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RaceTick.name,       schema: RaceTickSchema       },
      { name: RaceEvent.name,      schema: RaceEventSchema      },
      { name: HorseRaceStats.name, schema: HorseRaceStatsSchema },
      { name: RawResult.name,      schema: RawResultSchema      },
    ]),

    RaceModule,
    RaceCourseModule,
    RaceConditionModule,
    RegistrationModule,
    UserModule
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
    RawResultRepository
  ],
})
export class RaceSimulationModule {}