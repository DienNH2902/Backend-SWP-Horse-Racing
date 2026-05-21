import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  JockeyLicense,
  JockeyLicenseSchema,
} from './schemas/jockey-license.schema';
import { JockeyLicenseRepository } from './jockey-license.repository';
import { JockeyLicenseService } from './jockey-license.service';
import { JockeyLicenseController } from './jockey-license.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JockeyLicense.name, schema: JockeyLicenseSchema },
    ]),
    UserModule,
  ],
  controllers: [JockeyLicenseController],
  providers: [JockeyLicenseRepository, JockeyLicenseService],
  exports: [MongooseModule, JockeyLicenseRepository, JockeyLicenseService],
})
export class JockeyLicenseModule {}
