import express from 'express';
import type { ErrorRequestHandler } from 'express';
import path from 'node:path';
import type { ApiError, HealthResponse, PuzzleResponse } from '../types/api.js';
import { isPuzzleDate } from '../lib/puzzles/parse.js';
import { pacificDate, PuzzleUnavailableError, type PuzzleSource } from '../lib/puzzles/today.js';

export interface AppOptions {
  production?: boolean;
  staticDir?: string;
  /** Supplies daily puzzles; GET /api/puzzle/today returns 404 when omitted. */
  puzzles?: PuzzleSource;
  /** Clock for "today"; injectable so tests can pin the time. */
  now?: () => Date;
}

export function createApp({
  production = false, staticDir = path.resolve('dist'), puzzles, now = () => new Date(),
}: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true } satisfies HealthResponse);
  });
  app.get('/api/puzzle/today', async (req, res, next) => {
    // ?date= lets developers load another day's file; production always uses today.
    const override = production ? undefined : req.query.date;
    if (override !== undefined && (typeof override !== 'string' || !isPuzzleDate(override))) {
      res.status(400).json({ error: { code: 'INVALID_DATE', message: 'date must be a real YYYY-MM-DD date' } } satisfies ApiError);
      return;
    }
    const date = override ?? pacificDate(now());
    try {
      if (!puzzles) throw new PuzzleUnavailableError('missing', date);
      res.json(await puzzles.getPuzzleForDate(date) satisfies PuzzleResponse);
    } catch (error) {
      if (!(error instanceof PuzzleUnavailableError)) return next(error);
      if (error.reason === 'invalid') console.error(`Invalid puzzle file for ${date}:`, error.cause);
      res.status(404).json({ error: { code: 'PUZZLE_NOT_FOUND', message: `No puzzle is available for ${date}` } } satisfies ApiError);
    }
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
