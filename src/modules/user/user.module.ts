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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: JockeyProfile.name, schema: JockeyProfileSchema },
      { name: SpectatorProfile.name, schema: SpectatorProfileSchema },
      { name: RefereeProfile.name, schema: RefereeProfileSchema },
      { name: HorseOwnerProfile.name, schema: HorseOwnerProfileSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [MongooseModule, UsersService, UsersRepository],
})
export class UserModule {}
