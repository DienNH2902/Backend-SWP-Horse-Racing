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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface RaceTickFrame {
  tickNumber: number;
  horses: {
    horseId: string;
    progress: number;
    currentSpeed: number;
    lane: number;
  }[];
}

export interface RaceEventFrame {
  tickNumber: number;
  eventType: string;
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

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'https://horse-racing.io.vn',
      'https://goldenhoof-fe.vercel.app',
    ],
    credentials: true,
  },
  namespace: '/race',
  transports: ['websocket', 'polling'],
})
export class RaceBroadcastGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RaceBroadcastGateway.name);
  private broadcastService: any;

  constructor(private readonly jwtService: JwtService) {}

  setBroadcastService(service: any) {
    this.broadcastService = service;
  }

  // ── Verify JWT ngay tại handshake — trước khi connect thành công ──────────
  // Cách này tốt hơn dùng guard trên từng @SubscribeMessage
  // vì reject ngay từ đầu, không cần check lại mỗi event
  async handleConnection(client: Socket) {
    const raw: string =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization ||
      '';

    if (!raw) {
      this.logger.warn(`[WS] No token — reject ${client.id}`);
      client.disconnect();
      return;
    }

    try {
      const token = raw.replace('Bearer ', '');
      const payload = this.jwtService.verify(token);
      (client as any).user = payload;
      this.logger.log(
        `[WS] Connected: ${client.id} (user: ${payload._id}, role: ${payload.role})`,
      );
    } catch {
      this.logger.warn(`[WS] Invalid token — reject ${client.id}`);
      client.disconnect();
    }
  }   

  handleDisconnect(client: Socket) {
    this.logger.log(`[WS] Disconnected: ${client.id}`);
  }

  // ── Join room ─────────────────────────────────────────────────────────────
  @SubscribeMessage('join_race')
  handleJoinRace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { raceId: string },
  ) {
    const room = `race:${data.raceId}`;
    client.join(room);
    this.logger.log(`[WS] ${client.id} joined ${room}`);

    // Catch-up: nếu race đang broadcast → gửi snapshot hiện tại
    if (this.broadcastService) {
      const snapshot = this.broadcastService.getCurrentSnapshot(data.raceId);
      if (snapshot) {
        this.logger.log(
          `[WS] Catch-up tick=${snapshot.tickNumber} → ${client.id}`,
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

  // ── Leave room ────────────────────────────────────────────────────────────
  @SubscribeMessage('leave_race')
  handleLeaveRace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { raceId: string },
  ) {
    client.leave(`race:${data.raceId}`);
    this.logger.log(`[WS] ${client.id} left race:${data.raceId}`);
  }

  // ── Emit methods ──────────────────────────────────────────────────────────
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