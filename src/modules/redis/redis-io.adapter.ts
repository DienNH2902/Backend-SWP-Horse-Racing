// src/redis/redis-io.adapter.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const configService = this.app.get(ConfigService);
    const redisOptions = {
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD') || undefined,
    };

    // Pub/sub PHẢI dùng connection riêng, không share với REDIS_CLIENT
    // dùng cho state (GET/SET/HSET...) — ioredis ở chế độ subscribe
    // sẽ block mọi lệnh khác trên cùng 1 connection.
    this.pubClient = new Redis(redisOptions);
    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('error', (err) =>
      this.logger.error(`[Redis pubClient] ${err.message}`),
    );
    this.subClient.on('error', (err) =>
      this.logger.error(`[Redis subClient] ${err.message}`),
    );

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        this.pubClient.once('ready', resolve);
        this.pubClient.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        this.subClient.once('ready', resolve);
        this.subClient.once('error', reject);
      }),
    ]);

    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    this.logger.log('[Redis] Socket.IO adapter đã kết nối');
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}