import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist-server/lib/db', { recursive: true });
cpSync('lib/db/migrations', 'dist-server/lib/db/migrations', { recursive: true });
