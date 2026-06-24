import { Module } from '@nestjs/common';
import { PrizeDistributionService } from './prize-distribution.service';
import { PrizeDistributionController } from './prize-distribution.controller';

@Module({
  controllers: [PrizeDistributionController],
  providers: [PrizeDistributionService],
})
export class PrizeDistributionModule {}
