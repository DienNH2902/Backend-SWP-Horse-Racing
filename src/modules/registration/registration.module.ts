import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RegistrationController,
  AdminRegistrationController,
} from './registration.controller';
import { RegistrationService } from './registration.service';
import { RegistrationRepository } from './registration.repository';
import {
  Registration,
  RegistrationSchema,
} from './schemas/registration.schema';

// Import schemas của các module liên quan
import {
  JockeyInvitation,
  JockeyInvitationSchema,
} from '../invitation/schemas/invitation.schema';
import {
  Contract,
  ContractSchema,
} from '../invitation/schemas/contract.schema';
import {
  HorseOwnerProfile,
  HorseOwnerProfileSchema,
} from '../user/schemas/horse-owner-profile.schema';
import {
  Notification,
  NotificationSchema,
} from '../notification/schemas/notification.schema';
import {
  Tournament,
  TournamentSchema,
} from '../tournament/schemas/tournament.schema';
import { TournamentModule } from '../tournament/tournament.module';
import { NotificationModule } from '../notification/notification.module';
import { JockeyInvitationModule } from '../invitation/invitation.module';
import {
  Transaction,
  TransactionSchema,
} from '../payment/schemas/transaction.schema';
import { PaymentModule } from '../payment/payment.module';

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
    JockeyInvitationModule,
    TournamentModule,
    PaymentModule,
    NotificationModule,
  ],
  controllers: [
    RegistrationController,
    AdminRegistrationController,
    RegistrationController,
  ],
  providers: [RegistrationService, RegistrationRepository],
  exports: [RegistrationService, RegistrationRepository],
})
export class RegistrationModule {}
