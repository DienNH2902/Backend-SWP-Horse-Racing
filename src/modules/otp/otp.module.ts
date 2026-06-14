import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { UserModule } from '../user/user.module';
import { OtpRepository } from './otp.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Otp.name, schema: OtpSchema }]),
    UserModule,
  ],
  controllers: [OtpController],
  providers: [OtpService, OtpRepository],
})
export class OtpModule {}
