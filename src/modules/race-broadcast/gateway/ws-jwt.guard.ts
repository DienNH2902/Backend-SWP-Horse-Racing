import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    // WebSocket dùng switchToWs() thay vì switchToHttp()
    const client: Socket = context.switchToWs().getClient();

    // FE gửi token qua handshake:
    // io('/race', { auth: { token: 'Bearer xxx' } })
    const raw: string =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization ||
      '';

    if (!raw) {
      this.logger.warn(`[WS] No token — reject ${client.id}`);
      client.disconnect();
      return false;
    }

    try {
      const token = raw.replace('Bearer ', '');
      // Tái dụng JwtService — cùng secret với JwtAuthGuard
      const payload = this.jwtService.verify(token);
      // Gắn user vào socket để dùng trong handler nếu cần
      (client as any).user = payload;
      return true;
    } catch {
      this.logger.warn(`[WS] Invalid token — reject ${client.id}`);
      client.disconnect();
      return false;
    }
  }
}