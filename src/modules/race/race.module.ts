import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RaceController } from './race.controller';
import { RaceService } from './race.service';
import { RaceAssignService } from './race-assign.service';
import { RaceRepository } from './race.repository';
import { Race, RaceSchema } from './schemas/race.schema';
import {
  Tournament,
  TournamentSchema,
} from '../tournament/schemas/tournament.schema';
import { RaceCourseModule } from './race-course/race-course.module';
import { RaceConditionModule } from './race-condition/race-condition.module';
import { RefereeReportModule } from '../referee-report/referee-report.module';
import { TournamentRepository } from '../tournament/tournament.repository';
import { RegistrationRepository } from '../registration/registration.repository';
import {
  Registration,
  RegistrationSchema,
} from '../registration/schemas/registration.schema';
import {
  Transaction,
  TransactionSchema,
} from '../payment/schemas/transaction.schema';
import { TransactionRepository } from '../payment/transaction.repository';
import {
  Notification,
  NotificationSchema,
} from '../notification/schemas/notification.schema';
import { NotificationRepository } from '../notification/notification.repository';
import {
  HorseOwnerProfile,
  HorseOwnerProfileSchema,
} from '../user/schemas/horse-owner-profile.schema';
import {
  RaceCourse,
  RaceCourseSchema,
} from './race-course/schemas/race-course.schema';
import { RaceCourseRepository } from './race-course/race-course.repository';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Race.name, schema: RaceSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: Registration.name, schema: RegistrationSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: HorseOwnerProfile.name, schema: HorseOwnerProfileSchema },
      { name: RaceCourse.name, schema: RaceCourseSchema },
    ]),
    RaceCourseModule,
    RaceConditionModule,
    forwardRef(() => RefereeReportModule),
  ],
  controllers: [RaceController],
  providers: [
    RaceService,
    RaceAssignService,
    RaceRepository,
    TournamentRepository,
    RegistrationRepository,
    TransactionRepository,
    NotificationRepository,
    RaceCourseRepository,
  ],
  exports: [RaceService, RaceRepository],
})
export class RaceModule {}
