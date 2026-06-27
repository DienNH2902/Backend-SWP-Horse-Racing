import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrizeDistributionService } from './prize-distribution.service';
import { PrizeDistributionController } from './prize-distribution.controller';
import { PrizeDistributionRepository } from './prize-distribution.repository';
import { PrizeRepository } from './prize.repository';
import {
  PrizeDistribution,
  PrizeDistributionSchema,
} from './schemas/prize-distribution.schema';
import { Prize, PrizeSchema } from './schemas/prize.schema';
import { JockeyInvitationModule } from '../invitation/invitation.module';
import { PaymentModule } from '../payment/payment.module';
import { UserModule } from '../user/user.module';
import { RaceModule } from '../race/race.module';
import { TournamentModule } from '../tournament/tournament.module';
import { RawResultModule } from '../raw-result/raw-result.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PrizeDistribution.name, schema: PrizeDistributionSchema },
      { name: Prize.name, schema: PrizeSchema },
    ]),
    JockeyInvitationModule,
    PaymentModule, 
    UserModule, 
    RaceModule, 
    TournamentModule,
    RawResultModule, 
  ],
  controllers: [PrizeDistributionController],
  providers: [
    PrizeDistributionService,
    PrizeDistributionRepository,
    PrizeRepository,
  ],
  exports: [PrizeDistributionService, PrizeRepository],
})
export class PrizeDistributionModule {}