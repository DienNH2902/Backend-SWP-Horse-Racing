import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { RaceBroadcastGateway } from './gateway/race-broadcast.gateway';
import { WsJwtGuard } from './gateway/ws-jwt.guard';
import { RaceBroadcastService } from './race-broadcast.service';
import { RaceBroadcastController } from './race-broadcast.controller';

import { RaceSimulationModule } from '../race-simulation/race-simulation.module';
import { RaceModule } from '../race/race.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    RaceSimulationModule, // export: RaceTickRepo, RaceEventRepo, RawResultRepo
    RaceModule,           // export: RaceRepository
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