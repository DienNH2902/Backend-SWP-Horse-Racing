import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RegistrationController,
  AdminRegistrationController,
  RaceRegistrationController,
} from './registration.controller';
import { RegistrationService } from './registration.service';
import { RegistrationRepository } from './registration.repository';
import { Registration, RegistrationSchema } from './schemas/registration.schema';

// Import schemas của các module liên quan
import {
  JockeyInvitation,
  JockeyInvitationSchema,
} from '../invitation/schemas/invitation.schema';
import { Contract, ContractSchema } from '../invitation/schemas/contract.schema';
import {
  HorseOwnerProfile,
  HorseOwnerProfileSchema,
} from '../user/schemas/horse-owner-profile.schema';
import {
  Transaction,
  TransactionSchema,
} from '../transaction/schemas/transaction.schema';
import {
  Notification,
  NotificationSchema,
} from '../notification/schemas/notification.schema';
import { Tournament, TournamentSchema } from '../tournament/schemas/tournament.schema'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Registration.name, schema: RegistrationSchema },
      { name: JockeyInvitation.name, schema: JockeyInvitationSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: HorseOwnerProfile.name, schema: HorseOwnerProfileSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [
    RegistrationController,
    AdminRegistrationController,
    RaceRegistrationController,
  ],
  providers: [RegistrationService, RegistrationRepository],
  exports: [RegistrationService, RegistrationRepository],
})
export class RegistrationModule {}