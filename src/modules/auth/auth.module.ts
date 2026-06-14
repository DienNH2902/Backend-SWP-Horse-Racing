import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Đăng ký toàn bộ các schema để phục vụ lưu trữ profile phụ
import { User, UserSchema } from '../user/schemas/user.schema';
import {
  JockeyProfile,
  JockeyProfileSchema,
} from '../user/schemas/jockey-profile.schema';
import {
  SpectatorProfile,
  SpectatorProfileSchema,
} from '../user/schemas/spectator-profile.schema';
import {
  RefereeProfile,
  RefereeProfileSchema,
} from '../user/schemas/referee-profile.schema';
import {
  HorseOwnerProfile,
  HorseOwnerProfileSchema,
} from '../user/schemas/horse-owner-profile.schema';
import { GoogleStrategy } from './strategies/google.strategy';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    UserModule,
    MailModule, // Đưa UserModule vào để lấy được UsersRepository phục vụ nghiệp vụ
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: JockeyProfile.name, schema: JockeyProfileSchema },
      { name: SpectatorProfile.name, schema: SpectatorProfileSchema },
      { name: RefereeProfile.name, schema: RefereeProfileSchema },
      { name: HorseOwnerProfile.name, schema: HorseOwnerProfileSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [PassportModule, JwtStrategy],
})
export class AuthModule {}
