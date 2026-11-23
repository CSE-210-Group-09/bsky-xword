import express from 'express';
import type { ErrorRequestHandler } from 'express';
import path from 'node:path';
import type { ApiError, HealthResponse } from '../types/api.js';
import { AppViewError, type AppView } from '../lib/atproto/appview.js';
import type { ResultsDatabase } from '../lib/db/index.js';
import { isPuzzleDate } from '../lib/puzzles/parse.js';
import { buildLeaderboard } from './leaderboard.js';

// did:plc:… or did:web:… (W3C DID syntax, bounded so junk never reaches the AppView).
const DID_PATTERN = /^did:[a-z]+:[a-zA-Z0-9._:%-]{1,2000}$/;

const sendError = (res: express.Response, status: number, code: string, message: string) => {
  res.status(status).json({ error: { code, message } } satisfies ApiError);
};

export interface AppOptions {
  production?: boolean;
  staticDir?: string;
  /** Results index; the leaderboard returns 503 without it. */
  database?: ResultsDatabase;
  /** Bluesky AppView for follow lists and profiles. */
  appView?: AppView;
}

export function createApp({
  production = false, staticDir = path.resolve('dist'), database, appView,
}: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true } satisfies HealthResponse);
  });
  app.get('/api/leaderboard', async (req, res, next) => {
    const { did, date } = req.query;
    if (typeof did !== 'string' || !DID_PATTERN.test(did)) {
      return sendError(res, 400, 'INVALID_DID', 'did must be a DID such as did:plc:…');
    }
    if (typeof date !== 'string' || !isPuzzleDate(date)) {
      return sendError(res, 400, 'INVALID_DATE', 'date must be a real YYYY-MM-DD date');
    }
    if (!database || !appView) return sendError(res, 503, 'UNAVAILABLE', 'Leaderboard is not configured');
    try {
      res.json(await buildLeaderboard({ did, date, appView, database }));
    } catch (error) {
      if (!(error instanceof AppViewError)) return next(error);
      // 400 from getFollows means the AppView doesn't know this account.
      if (error.status === 400) return sendError(res, 404, 'ACCOUNT_NOT_FOUND', 'No Bluesky account found for that DID');
      console.error('Leaderboard AppView request failed:', error);
      sendError(res, 502, 'UPSTREAM_ERROR', 'Could not load follows from Bluesky');
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
