import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { RaceBroadcastGateway } from './gateway/race-broadcast.gateway';
// import { WsJwtGuard } from './gateway/ws-jwt.guard';
import { RaceBroadcastService } from './race-broadcast.service';
import { RaceBroadcastController } from './race-broadcast.controller';

import { RaceSimulationModule } from '../race-simulation/race-simulation.module';
import { RaceModule } from '../race/race.module';
import { NotificationModule } from '../notification/notification.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SpectatorProfile,
  SpectatorProfileSchema,
} from '../user/schemas/spectator-profile.schema';

@Module({
  imports: [
    // Dùng registerAsync để đọc JWT_SECRET đúng từ ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: SpectatorProfile.name, schema: SpectatorProfileSchema },
    ]),
    RaceSimulationModule,
    RaceModule,
    NotificationModule,
  ],
  controllers: [RaceBroadcastController],
  providers: [RaceBroadcastGateway, RaceBroadcastService],
  exports: [RaceBroadcastService, RaceBroadcastGateway],
})
export class RaceBroadcastModule {}
