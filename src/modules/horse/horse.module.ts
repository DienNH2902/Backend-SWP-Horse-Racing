import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HorseController } from './horse.controller';
import { HorseService } from './horse.service';
import { HorseRepository } from './horse.repository';
import { Horse, HorseSchema } from './schemas/horse.schema';
import { RawResult, RawResultSchema } from '../raw-result/schemas/raw-result.schema';
import { RawResultRepository } from '../raw-result/raw-result.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Horse.name, schema: HorseSchema },
      { name: RawResult.name, schema: RawResultSchema },
    ]),
  ],
  controllers: [HorseController],
  providers: [HorseService, HorseRepository, RawResultRepository],
  exports: [HorseService, HorseRepository],
})
export class HorseModule {}