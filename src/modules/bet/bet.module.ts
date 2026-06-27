// src/bet/bet.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BetController } from './bet.controller';
import { BetService } from './bet.service';
import { BetRepository } from './bet.repository';
import { Bet, BetSchema } from './schemas/bet.schema';

// Hãy chắc chắn import các module chứa các Repository/Service tương ứng dưới đây vào hệ thống
import { RaceModule } from '../race/race.module';
import { HorseModule } from '../horse/horse.module';
import { RegistrationModule } from '../registration/registration.module';
import { PointsTransactionModule } from '../points-transaction/points-transaction.module';
import { NotificationModule } from '../notification/notification.module';
import {
  SpectatorProfile,
  SpectatorProfileSchema,
} from '../user/schemas/spectator-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bet.name, schema: BetSchema },
      { name: SpectatorProfile.name, schema: SpectatorProfileSchema },
    ]),
    RaceModule,
    HorseModule,
    RegistrationModule,
    PointsTransactionModule,
    NotificationModule,
  ],
  controllers: [BetController],
  providers: [BetService, BetRepository],
  exports: [BetService],
})
export class BetModule {}
