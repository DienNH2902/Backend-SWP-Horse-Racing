// src/redis/redis.options.ts — FILE MỚI, dùng chung cho RedisModule + RedisIoAdapter
import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

// Ưu tiên REDIS_URL — provider như Upstash/Redis Cloud cho sẵn 1 chuỗi này
// trong dashboard, copy thẳng vào .env là xong (tự chứa cả TLS nếu là rediss://).
// Không có REDIS_URL (chạy local) → fallback về host/port/password rời.
export function buildRedisConnectionInput(
  configService: ConfigService,
): string | RedisOptions {
  const url = configService.get<string>('REDIS_URL');
  if (url) return url;

  return {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
    password: configService.get<string>('REDIS_PASSWORD') || undefined,
  };
}