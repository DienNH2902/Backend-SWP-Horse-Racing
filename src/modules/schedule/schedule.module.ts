import { Module, forwardRef } from '@nestjs/common';

import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { RaceModule } from '../race/race.module';
import { RegistrationModule } from '../registration/registration.module';

@Module({
  imports: [
    forwardRef(() => RaceModule),
    forwardRef(() => RegistrationModule),
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class RaceScheduleModule {}