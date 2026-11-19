import path from 'node:path';

export interface ServerConfig {
  port: number;
  dbPath: string;
  publicUrl: string;
  production: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const publicUrl = new URL(env.PUBLIC_URL ?? `http://localhost:${port}`);
  if (!['http:', 'https:'].includes(publicUrl.protocol)) {
    throw new Error('PUBLIC_URL must use HTTP or HTTPS');
  }
  return {
    port,
    dbPath: path.resolve(env.DB_PATH ?? 'data/local.db'),
    publicUrl: publicUrl.origin,
    production: env.NODE_ENV === 'production',
  };
}
