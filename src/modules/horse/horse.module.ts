import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HorseController } from './horse.controller';
import { HorseService } from './horse.service';
import { HorseRepository } from './horse.repository';
import { Horse, HorseSchema } from './schemas/horse.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Horse.name, schema: HorseSchema }]),
  ],
  controllers: [HorseController],
  providers: [HorseService, HorseRepository],
  exports: [HorseService, HorseRepository],
})
export class HorseModule {}
