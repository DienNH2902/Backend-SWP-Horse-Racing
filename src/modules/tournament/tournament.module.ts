// src/tournament/tournament.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { TournamentRepository } from './tournament.repository';
import { Tournament, TournamentSchema } from './schemas/tournament.schema';
import {
  UserTournament,
  UserTournamentSchema,
} from './schemas/user-tournament.schema';
import { UserTournamentRepository } from './user-tournament.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
      { name: UserTournament.name, schema: UserTournamentSchema },
    ]),
  ],
  controllers: [TournamentController],
  providers: [
    TournamentService,
    TournamentRepository,
    UserTournamentRepository,
  ],
  exports: [TournamentService, TournamentRepository],
})
export class TournamentModule {}
