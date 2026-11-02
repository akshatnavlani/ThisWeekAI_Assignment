import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { applyMigrations } from "./migrate";
import * as schema from "./schema";

export type AppDb = BetterSQLite3Database<typeof schema>;

type DbGlobal = {
  conn?: Database.Database;
  db?: AppDb;
  path?: string;
};

const globalForDb = globalThis as typeof globalThis & {
  __editorialDb?: DbGlobal;
};

export function resolveDatabasePath(overridePath?: string): string {
  const raw =
    overridePath ?? process.env.DATABASE_PATH ?? "./data/editorial.db";
  if (path.isAbsolute(raw)) {
    return raw;
  }
  // Relative paths resolve from process cwd (local editorial.db under ./data by default).
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), raw);
}

export function openDb(databasePath: string): AppDb {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  applyMigrations(db);
  return db;
}

/**
 * Process-singleton DB for the app. Pass `databasePath` in tests to isolate files.
 * When a different path is requested, closes the previous connection.
 */
export function getDb(databasePath?: string): AppDb {
  const resolved = resolveDatabasePath(databasePath);
  const g = globalForDb.__editorialDb ?? {};

  if (g.db && g.path === resolved) {
    return g.db;
  }

  if (g.conn) {
    g.conn.close();
  }

  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const sqlite = new Database(resolved);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  applyMigrations(db);

  globalForDb.__editorialDb = {
    conn: sqlite,
    db,
    path: resolved,
  };

  return db;
}

/** Test helper: drop singleton so the next getDb opens a fresh connection. */
export function resetDbSingleton(): void {
  const g = globalForDb.__editorialDb;
  if (g?.conn) {
    g.conn.close();
  }
  globalForDb.__editorialDb = undefined;
}
