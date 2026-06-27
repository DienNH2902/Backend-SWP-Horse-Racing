// src/prize-distribution/prize.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PrizeController } from './prize.controller';
import { PrizeService } from './prize.service';
import { PrizeRepository } from './prize.repository';
import { Prize, PrizeSchema } from './schemas/prize.schema';

import { TournamentModule } from '../tournament/tournament.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Prize.name, schema: PrizeSchema }]),
    forwardRef(() => TournamentModule),
  ],
  controllers: [PrizeController],
  providers: [PrizeService, PrizeRepository],
  exports: [PrizeService, PrizeRepository],
})
export class PrizeModule {}