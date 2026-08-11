import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";

/**
 * Local dev uses a plain SQLite file ("file:./dev.db") via better-sqlite3.
 * Production (Vercel has no persistent/shared filesystem) uses Turso, a
 * hosted, serverless-friendly SQLite-compatible database, addressed as a
 * "libsql://...?authToken=..." URL. Both are the "sqlite" Prisma provider,
 * so the schema and query code never need to know which one is active.
 */
export function createDbAdapter(databaseUrl: string) {
  if (/^(libsql|https?|wss):\/\//.test(databaseUrl)) {
    const parsed = new URL(databaseUrl);
    const authToken = parsed.searchParams.get("authToken") ?? process.env.TURSO_AUTH_TOKEN ?? undefined;
    parsed.searchParams.delete("authToken");
    return new PrismaLibSql({ url: parsed.toString(), authToken });
  }
  return new PrismaBetterSqlite3({ url: databaseUrl });
}
