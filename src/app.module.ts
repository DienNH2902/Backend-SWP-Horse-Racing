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
import { RaceSimulationModule } from './modules/race-simulation/race-simulation.module';
import { RefereeReportModule } from './modules/referee-report/referee-report.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from 'node_modules/@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { OtpModule } from './modules/otp/otp.module';
import { RaceBroadcastModule } from './modules/race-broadcast/race-broadcast.module';
import { StreakModule } from './modules/streak/streak.module';

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
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: 'smtp.resend.com',
          port: 465,
          // ignoreTLS: true,
          secure: true,
          auth: {
            user: 'resend',
            // user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('PASS_USER'),
          },
        },
        defaults: {
          from: `"GoldenHoof" <${configService.get<string>('MAIL_USER')}>`,
        },
        // preview: true,
        template: {
          // dir: process.cwd() + '/template/',
          dir: join(__dirname, 'modules/mail/templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),

      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    UserModule,
    AuthModule,
    OtpModule,
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
    RaceSimulationModule,
    RefereeReportModule,
    RaceBroadcastModule,
    StreakModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
