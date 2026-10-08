import { ConfigService } from '@nestjs/config';
import type { QueueOptions } from 'bullmq';

export interface BullMqRedisConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export function getBullMqRedisConfig(
  config: ConfigService,
): BullMqRedisConfig {
  const host = config.getOrThrow<string>('REDIS_HOST');
  const port = Number(config.getOrThrow<string>('REDIS_PORT'));

  const username = config.get<string>('REDIS_USERNAME')?.trim();
  const password = config.get<string>('REDIS_PASSWORD')?.trim();

  return {
    host,
    port,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
  };
}

export function getBullMqRootOptions(
  config: ConfigService,
): QueueOptions {
  const redis = getBullMqRedisConfig(config);

  return {
    connection: redis,
  };
}

export function getBullMqConnectionOptions(
  config: ConfigService,
): BullMqRedisConfig {
  return getBullMqRedisConfig(config);
}
