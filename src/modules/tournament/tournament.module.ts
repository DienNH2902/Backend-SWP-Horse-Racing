// src/tournament/tournament.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { TournamentRepository } from './tournament.repository';
import { Tournament, TournamentSchema } from './schemas/tournament.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
    ]),
  ],
  controllers: [TournamentController],
  providers: [TournamentService, TournamentRepository],
  exports: [TournamentService, TournamentRepository],
})
export class TournamentModule {}
