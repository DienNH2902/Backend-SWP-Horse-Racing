import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';

// ── Frame types push xuống FE ─────────────────────────────────────────────────

export interface RaceTickFrame {
  tickNumber: number;
  horses: {
    horseId: string;
    progress: number;      // 0.0 → 1.0
    currentSpeed: number;
    lane: number;
  }[];
}

export interface RaceEventFrame {
  tickNumber: number;
  eventType: string;       // stumble | burst | overtake | lead_change
  primaryHorseId: string;
  secondaryHorseId: string | null;
}

export interface RaceFinishedFrame {
  raceId: string;
  results: {
    horseId: string;
    rawRank: number;
    finishedTime: Date;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────

@WebSocketGateway({
  cors: { origin: '*' },   // chỉnh origin cho production
  namespace: '/race',      // FE connect: io('http://host/race')
})
export class RaceBroadcastGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RaceBroadcastGateway.name);

  // Inject service để lấy snapshot — set sau khi module init (tránh circular)
  private broadcastService: any;

  setBroadcastService(service: any) {
    this.broadcastService = service;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  handleConnection(client: Socket) {
    this.logger.log(`[WS] Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WS] Disconnected: ${client.id}`);
  }

  // ── Client join room để xem race ─────────────────────────────────────────
  // FE gọi: socket.emit('join_race', { raceId: '...' })
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_race')
  handleJoinRace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { raceId: string },
  ) {
    const room = `race:${data.raceId}`;
    client.join(room);
    this.logger.log(`[WS] Client ${client.id} joined ${room}`);

    // ── Catch-up: nếu race đang broadcast → gửi snapshot tick hiện tại ──
    if (this.broadcastService) {
      const snapshot = this.broadcastService.getCurrentSnapshot(data.raceId);
      if (snapshot) {
        this.logger.log(
          `[WS] Sending catch-up snapshot tick=${snapshot.tickNumber} to ${client.id}`,
        );
        client.emit('race_snapshot', {
          type: 'catch_up',
          tickNumber: snapshot.tickNumber,
          horses: snapshot.horses,
        });
      }
    }

    client.emit('joined', {
      raceId: data.raceId,
      message: 'Đã vào phòng xem đua',
    });
  }

  // ── Client leave room ────────────────────────────────────────────────────
  @SubscribeMessage('leave_race')
  handleLeaveRace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { raceId: string },
  ) {
    client.leave(`race:${data.raceId}`);
    this.logger.log(`[WS] Client ${client.id} left race:${data.raceId}`);
  }

  // ── Emit methods (gọi từ BroadcastService) ────────────────────────────────

  emitTick(raceId: string, payload: RaceTickFrame) {
    this.server.to(`race:${raceId}`).emit('race_tick', payload);
  }

  emitRaceEvent(raceId: string, payload: RaceEventFrame) {
    this.server.to(`race:${raceId}`).emit('race_event', payload);
  }

  emitRaceFinished(raceId: string, payload: RaceFinishedFrame) {
    this.server.to(`race:${raceId}`).emit('race_finished', payload);
  }
}