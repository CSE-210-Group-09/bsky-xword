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
  const handleError: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) return next(error);

    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    if (error?.type === 'entity.parse.failed') {
      status = 400;
      code = 'INVALID_JSON';
      message = 'Invalid JSON body';
    } else if (error?.type === 'entity.too.large') {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'Request body too large';
    } else if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) {
      status = error.status;
      code = 'BAD_REQUEST';
      message = 'Bad request';
    } else {
      console.error(error);
    }
    res.status(status).json({ error: { code, message } } satisfies ApiError);
  };
  app.use(handleError);
  return app;
}
