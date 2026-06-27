// src/tournament/tournament.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TournamentController } from './tournament.controller';

import { AdvancementService } from './round-advancement.service';
import { TournamentService } from './tournament.service';

import { TournamentRepository } from './tournament.repository';
import { RoundAdvancementRepository } from './round-advancement.repository';
import { PrizeDistributionRepository } from '../prize-distribution/prize-distribution.repository';
import { Tournament, TournamentSchema } from './schemas/tournament.schema';
import { RoundAdvancement, RoundAdvancementSchema } from './schemas/round-advancement.schema';
import { PrizeDistribution, PrizeDistributionSchema } from '../prize-distribution/schemas/prize-distribution.schema';

import { RegistrationModule } from '../registration/registration.module';
import { RawResultModule } from '../raw-result/raw-result.module';
import { RaceModule } from '../race/race.module';
import { PrizeModule } from '../prize-distribution/prize.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
      { name: RoundAdvancement.name, schema: RoundAdvancementSchema },
      { name: PrizeDistribution.name, schema: PrizeDistributionSchema },
    ]),
    forwardRef(() => RawResultModule),
    forwardRef(() => RaceModule),
    forwardRef(() => RegistrationModule),
    forwardRef(() => PrizeModule),
  ],
  controllers: [TournamentController],
  providers: [
    TournamentService,
    TournamentRepository,
    AdvancementService,
    RoundAdvancementRepository,
    PrizeDistributionRepository,
  ],
  exports: [TournamentService, TournamentRepository, AdvancementService],
})
export class TournamentModule {}