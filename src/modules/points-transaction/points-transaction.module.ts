import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PointsTransactionRepository } from './points-transaction.repository';
import { PointsTransactionService } from './points-transaction.service';
import { PointsTransactionController } from './points-transaction.controller';
import {
  PointsTransaction,
  PointsTransactionSchema,
} from './schemas/pointsTransaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PointsTransaction.name, schema: PointsTransactionSchema },
    ]),
  ],
  controllers: [PointsTransactionController],
  providers: [PointsTransactionRepository, PointsTransactionService],
  exports: [PointsTransactionService], // Export Service để các module khác (ví dụ: RewardModule) gọi ghi log
})
export class PointsTransactionModule {}
