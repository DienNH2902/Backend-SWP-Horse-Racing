import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RaceConditionController } from './race-condition.controller';
import { RaceConditionService } from './race-condition.service';
import { RaceConditionRepository } from './race-condition.repository';
import { RaceCondition, RaceConditionSchema } from './schemas/race-condition.schema';
import { RaceModule } from '../race.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RaceCondition.name, schema: RaceConditionSchema },
    ]),
    forwardRef(() => RaceModule), 
  ],
  controllers: [RaceConditionController],
  providers: [RaceConditionService, RaceConditionRepository],
  exports: [RaceConditionService, RaceConditionRepository],
})
export class RaceConditionModule {}