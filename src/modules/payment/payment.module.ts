import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { TransactionRepository } from './transaction.repository';
import { VnPayService } from './vnpay.service';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { NotificationModule } from '../notification/notification.module';
import { User, UserSchema } from '../user/schemas/user.schema';
import {
  HorseOwnerProfile,
  HorseOwnerProfileSchema,
} from '../user/schemas/horse-owner-profile.schema';
import {
  JockeyProfile,
  JockeyProfileSchema,
} from '../user/schemas/jockey-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: HorseOwnerProfile.name, schema: HorseOwnerProfileSchema },
      { name: JockeyProfile.name, schema: JockeyProfileSchema },
    ]),
    NotificationModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, VnPayService, TransactionRepository],
  exports: [PaymentService, TransactionRepository],
})
export class PaymentModule {}
