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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JockeyInvitation.name, schema: JockeyInvitationSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
    HorseModule,
    UserModule,
  ],
  controllers: [JockeyInvitationController],
  providers: [
    JockeyInvitationService,
    JockeyInvitationRepository,
    ContractRepository,
    InvitationExpiryTask,
  ],
  exports: [
    JockeyInvitationService,
    JockeyInvitationRepository,
    ContractRepository,
  ],
})
export class JockeyInvitationModule {}
