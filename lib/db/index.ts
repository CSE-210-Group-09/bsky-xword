import Database from 'better-sqlite3';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface IndexedResult {
  did: string;
  puzzleDate: string;
  puzzleId: string;
  timeSeconds: number;
  revealCount: number;
  checkCount: number;
  completedAt: string;
  uri: string;
  cid: string;
  indexedAt: string;
}

export type ResultInput = Omit<IndexedResult, 'indexedAt'>;

export interface ResultsDatabase {
  upsertResult(result: ResultInput): IndexedResult;
  getResultsForDate(date: string, dids: readonly string[]): IndexedResult[];
  close(): void;
}

const columns = `did, puzzle_date AS puzzleDate, puzzle_id AS puzzleId,
  time_seconds AS timeSeconds, reveal_count AS revealCount, check_count AS checkCount,
  completed_at AS completedAt, uri, cid, indexed_at AS indexedAt`;

/** The only module that knows the SQLite driver. API handlers consume ResultsDatabase. */
export function openResultsDatabase(filename: string): ResultsDatabase {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY)');
    const migrations = new URL('./migrations/', import.meta.url);
    db.transaction(() => {
      for (const version of readdirSync(migrations).filter(name => /^\d+-.*\.sql$/.test(name)).sort()) {
        if (db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(version)) continue;
        db.exec(readFileSync(new URL(version, migrations), 'utf8'));
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
      }
    })();

    const upsert = db.prepare(`INSERT INTO results
      (did, puzzle_date, puzzle_id, time_seconds, reveal_count, check_count, completed_at, uri, cid, indexed_at)
      VALUES (@did, @puzzleDate, @puzzleId, @timeSeconds, @revealCount, @checkCount, @completedAt, @uri, @cid, @indexedAt)
      ON CONFLICT(did, puzzle_date) DO UPDATE SET
        puzzle_id = excluded.puzzle_id, time_seconds = excluded.time_seconds,
        reveal_count = excluded.reveal_count, check_count = excluded.check_count,
        completed_at = excluded.completed_at, uri = excluded.uri, cid = excluded.cid,
        indexed_at = excluded.indexed_at`);

    return {
      upsertResult(result) {
        const entry: IndexedResult = { ...result, indexedAt: new Date().toISOString() };
        upsert.run(entry);
        return entry;
      },
      getResultsForDate(date, dids) {
        const unique = [...new Set(dids)];
        const results: IndexedResult[] = [];
        // Stay below even older SQLite builds' 999 bound-parameter limit.
        for (let offset = 0; offset < unique.length; offset += 900) {
          const batch = unique.slice(offset, offset + 900);
          results.push(...db.prepare(`SELECT ${columns} FROM results
            WHERE puzzle_date = ? AND did IN (${batch.map(() => '?').join(',')})`)
            .all(date, ...batch) as IndexedResult[]);
        }
        return results.sort((a, b) => a.timeSeconds - b.timeSeconds || a.did.localeCompare(b.did));
      },
      close() { db.close(); },
    };
  } catch (error) {
    db.close();
    throw error;
  }
}
