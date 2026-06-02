import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RaceController } from './race.controller';
import { RaceService } from './race.service';
import { RaceRepository } from './race.repository';
import { Race, RaceSchema } from './schemas/race.schema';
import { Tournament, TournamentSchema } from '../tournament/schemas/tournament.schema';
import { RaceCourseModule } from './race-course/race-course.module';
import { RaceConditionModule } from './race-condition/race-condition.module';
import { TournamentRepository } from '../tournament/tournament.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Race.name, schema: RaceSchema },
      { name: Tournament.name, schema: TournamentSchema },
    ]),
    RaceCourseModule,
    RaceConditionModule,
  ],
  controllers: [RaceController],
  providers: [RaceService, RaceRepository, TournamentRepository],
  exports: [RaceService, RaceRepository],
})
export class RaceModule {}