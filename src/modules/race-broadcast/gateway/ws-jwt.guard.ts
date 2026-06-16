import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();

    // FE gửi: io('/race', { auth: { token: 'Bearer xxx' } })
    const token =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization;

    if (!token) {
      this.logger.warn(`[WS] No token — client ${client.id} rejected`);
      client.disconnect();
      return false;
    }

    try {
      const raw = token.replace('Bearer ', '');
      const payload = this.jwtService.verify(raw);
      (client as any).user = payload;
      return true;
    } catch {
      this.logger.warn(`[WS] Invalid token — client ${client.id} rejected`);
      client.disconnect();
      return false;
    }
  }
}