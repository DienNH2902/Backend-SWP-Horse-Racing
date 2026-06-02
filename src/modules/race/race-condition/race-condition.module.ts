import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RaceConditionController } from './race-condition.controller';
import { RaceConditionService } from './race-condition.service';
import { RaceConditionRepository } from './race-condition.repository';
import { RaceCondition, RaceConditionSchema } from './schemas/race-condition.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RaceCondition.name, schema: RaceConditionSchema },
    ]),
  ],
  controllers: [RaceConditionController],
  providers: [RaceConditionService, RaceConditionRepository],
  exports: [RaceConditionService],
})
export class RaceConditionModule {}