import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JockeyInvitationController } from './invitation.controller';
import { JockeyInvitationService } from './invitation.service';
import { JockeyInvitationRepository } from './invitation.repository';
import { ContractRepository } from './contract.repository';
import {
  JockeyInvitation,
  JockeyInvitationSchema,
} from './schemas/invitation.schema';
import { Contract, ContractSchema } from './schemas/contract.schema';
import { HorseModule } from '../horse/horse.module';
import { UserModule } from '../user/user.module';
import { InvitationExpiryTask } from 'src/utils/expiry.task';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import {
  ContractBreach,
  ContractBreachSchema,
} from './schemas/contractBreach.schema';
import { ContractBreachService } from './contractBreach.service';
import { ContractBreachRepository } from './contractBreach.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JockeyInvitation.name, schema: JockeyInvitationSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: ContractBreach.name, schema: ContractBreachSchema },
    ]),
    HorseModule,
    UserModule,
    NotificationModule,
    PaymentModule,
  ],
  controllers: [JockeyInvitationController],
  providers: [
    JockeyInvitationService,
    JockeyInvitationRepository,
    ContractRepository,
    InvitationExpiryTask,
    ContractBreachService,
    ContractBreachRepository,
  ],
  exports: [
    JockeyInvitationService,
    JockeyInvitationRepository,
    ContractRepository,
    ContractBreachService,
  ],
})
export class JockeyInvitationModule {}
