import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';
import { UsersRepository } from './user.repository';
import { User, UserSchema } from './schemas/user.schema';
import {
  JockeyProfile,
  JockeyProfileSchema,
} from './schemas/jockey-profile.schema';
import {
  SpectatorProfile,
  SpectatorProfileSchema,
} from './schemas/spectator-profile.schema';
import {
  RefereeProfile,
  RefereeProfileSchema,
} from './schemas/referee-profile.schema';
import {
  HorseOwnerProfile,
  HorseOwnerProfileSchema,
} from './schemas/horse-owner-profile.schema';
import { Horse, HorseSchema } from '../horse/schemas/horse.schema';
import {
  RawResult,
  RawResultSchema,
} from '../raw-result/schemas/raw-result.schema';
import { Prize, PrizeSchema } from '../prize-distribution/schemas/prize.schema';

import { HorseRepository } from '../horse/horse.repository';
import { RawResultRepository } from '../raw-result/raw-result.repository';
import { PrizeRepository } from '../prize-distribution/prize.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: JockeyProfile.name, schema: JockeyProfileSchema },
      { name: SpectatorProfile.name, schema: SpectatorProfileSchema },
      { name: RefereeProfile.name, schema: RefereeProfileSchema },
      { name: HorseOwnerProfile.name, schema: HorseOwnerProfileSchema },
      { name: Horse.name, schema: HorseSchema },
      { name: RawResult.name, schema: RawResultSchema },
      { name: Prize.name, schema: PrizeSchema },

    ]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    HorseRepository,
    RawResultRepository,
    PrizeRepository,
  ],
  exports: [MongooseModule, UsersService, UsersRepository],
})
export class UserModule {}