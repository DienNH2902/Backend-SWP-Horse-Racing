import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { RaceBroadcastGateway } from './gateway/race-broadcast.gateway';
import { WsJwtGuard } from './gateway/ws-jwt.guard';
import { RaceBroadcastService } from './race-broadcast.service';
import { RaceBroadcastController } from './race-broadcast.controller';

import { RaceSimulationModule } from '../race-simulation/race-simulation.module';
import { RaceModule } from '../race/race.module';

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
    RaceSimulationModule,
    RaceModule,
  ],
  controllers: [RaceBroadcastController],
  providers: [
    RaceBroadcastGateway,
    RaceBroadcastService,
    WsJwtGuard,
  ],
  exports: [RaceBroadcastService, RaceBroadcastGateway],
})
export class RaceBroadcastModule {}