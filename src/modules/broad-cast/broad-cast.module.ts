import { Module } from '@nestjs/common';
import { BroadCastService } from './broad-cast.service';
import { BroadCastController } from './broad-cast.controller';

@Module({
  controllers: [BroadCastController],
  providers: [BroadCastService],
})
export class BroadCastModule {}
