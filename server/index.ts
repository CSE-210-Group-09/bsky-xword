import { filePuzzleSource } from '../lib/puzzles/today.js';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const server = createApp({
  production: config.production,
  puzzles: filePuzzleSource(config.puzzlesDir),
}).listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
