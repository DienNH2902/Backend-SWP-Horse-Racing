import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { JockeyLicenseModule } from './modules/jockey-license/jockey-license.module';
import { TournamentModule } from './modules/tournament/tournament.module';
import { HorseModule } from './modules/horse/horse.module';
import { JockeyInvitationModule } from './modules/invitation/invitation.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { NotificationModule } from './modules/notification/notification.module';
import { UploadModule } from './modules/upload/upload.module';
import { RaceModule } from './modules/race/race.module';
import { PaymentModule } from './modules/payment/payment.module';
import { UploadModule } from './modules/upload/upload.module';
import { VnPayModule } from './modules/vnpay/vnpay.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
      isGlobal: true,
    }), //Để cho phép configService ở mọi nơi mà không cần import lại
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuthModule,
    JockeyLicenseModule,
    TournamentModule,
    HorseModule,
    JockeyInvitationModule,
    RegistrationModule,
    NotificationModule,
    UploadModule,
    RaceModule,
    PaymentModule,
    UploadModule,
    VnPayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
