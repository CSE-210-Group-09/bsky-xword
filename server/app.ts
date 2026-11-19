import express from 'express';
import type { ErrorRequestHandler } from 'express';
import path from 'node:path';
import type { ApiError, HealthResponse } from '../types/api.js';

export interface AppOptions {
  production?: boolean;
  staticDir?: string;
}

export function createApp({ production = false, staticDir = path.resolve('dist') }: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true } satisfies HealthResponse);
  });
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API endpoint not found' } } satisfies ApiError);
  });
  if (production) {
    app.use(express.static(staticDir));
    app.get('/{*path}', (req, res, next) => {
      // Missing assets must not receive an HTML success response.
      if (path.extname(req.path) || !req.accepts('html')) return next();
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } } satisfies ApiError);
  });
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error.status === 400 ? 400 : error.status === 413 ? 413 : 500;
    const code = status === 400 ? 'INVALID_JSON' : status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR';
    const message = status === 400 ? 'Invalid JSON body' : status === 413 ? 'Request body too large' : 'Internal server error';
    res.status(status).json({ error: { code, message } } satisfies ApiError);
  };
  app.use(handleError);
  return app;
}
