import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * The scripts in this directory are plain Node programs rather than Nest
 * applications, so they have no ConfigModule to read .env for them.
 *
 * Values already present in the environment win, which is what lets a
 * container pass configuration in without a file on disk.
 */
export function loadEnvFile(path = join(__dirname, '..', '.env')): void {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    if (process.env[key] !== undefined) {
      continue;
    }

    const value = trimmed.slice(separator + 1).trim();
    process.env[key] = value.replace(/^(['"])(.*)\1$/, '$2');
  }
}

export function requiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
