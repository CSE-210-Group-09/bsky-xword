import { createAppView, withFollowCache } from '../lib/atproto/appview.js';
import { openResultsDatabase } from '../lib/db/index.js';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const database = openResultsDatabase(config.dbPath);
const appView = withFollowCache(createAppView({ baseUrl: config.appViewUrl }));
const server = createApp({ production: config.production, database, appView }).listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => { database.close(); process.exit(0); }));
}
