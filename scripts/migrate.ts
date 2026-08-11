import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

/**
 * Applies pending schema migrations, whichever database DATABASE_URL points at.
 *
 * - "file:..." (local SQLite): delegates to `prisma migrate deploy`, which works
 *   fine — the Rust migration engine understands local SQLite files natively.
 * - "libsql://..." / "https://..." / "wss://..." (Turso): Prisma's migration
 *   engine does NOT understand this scheme (confirmed: `prisma migrate deploy`
 *   fails with "P1013: the provided database string is invalid ... scheme is
 *   not recognized"). The generated Prisma Client supports Turso fine via
 *   @prisma/adapter-libsql at runtime — only the CLI's migration engine can't
 *   reach it. So for this case we apply each migration.sql file under
 *   prisma/migrations directly over the libSQL client instead, tracking what's
 *   already been applied in a small `_libsql_migrations` table (Prisma's own
 *   equivalent, `_prisma_migrations`, only gets created by the CLI path we
 *   can't use here).
 */

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const isRemote = /^(libsql|https?|wss):\/\//.test(databaseUrl);

async function migrateLocalSqlite() {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}

async function migrateTurso() {
  console.log(
    "DATABASE_URL is a remote libSQL/Turso database — applying migrations directly " +
      "via the libSQL client (see scripts/migrate.ts for why)."
  );

  const client = createClient({ url: databaseUrl, authToken: process.env.TURSO_AUTH_TOKEN });

  await client.execute(
    "CREATE TABLE IF NOT EXISTS _libsql_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
  );
  const applied = await client.execute("SELECT name FROM _libsql_migrations");
  const appliedNames = new Set(applied.rows.map((row) => String(row.name)));

  const migrationsDir = path.resolve(import.meta.dirname, "../prisma/migrations");
  const folders = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const folder of folders) {
    if (appliedNames.has(folder)) {
      console.log(`  skip  ${folder} (already applied)`);
      continue;
    }
    const sql = readFileSync(path.join(migrationsDir, folder, "migration.sql"), "utf8");
    console.log(`  apply ${folder}...`);
    await client.executeMultiple(sql);
    await client.execute({ sql: "INSERT INTO _libsql_migrations (name) VALUES (?)", args: [folder] });
  }

  console.log("libSQL schema is up to date.");
}

(isRemote ? migrateTurso() : migrateLocalSqlite()).catch((err) => {
  console.error(err);
  process.exit(1);
});
