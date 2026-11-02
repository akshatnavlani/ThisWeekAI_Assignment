import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import type * as schema from "./schema";

export function applyMigrations(
  db: BetterSQLite3Database<typeof schema>,
): void {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  migrate(db, { migrationsFolder });
}
