# Docs — a lightweight collaborative document editor

A small full-stack app inspired by Google Docs: create and edit rich-text documents in the
browser, import `.txt`/`.md` files as new documents, and share documents with other users at
view or edit permission. Built for the Ajaia AI-Native Full Stack Developer assignment.

- **Live product URL:** _add your deployed URL here_
- **Walkthrough video:** _add your Loom/YouTube link here_

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions and tradeoffs, and
[AI_WORKFLOW.md](./AI_WORKFLOW.md) for how AI tools were used while building this.

## Stack

- **Framework:** Next.js 16 (App Router), TypeScript, React 19
- **Editor:** TipTap (ProseMirror) — bold, italic, underline, headings (H1–H3), paragraphs,
  bulleted/numbered lists, blockquotes
- **Database:** SQLite via Prisma 7. Local dev uses a plain file (`@prisma/adapter-better-sqlite3`);
  the deployed app uses [Turso](https://turso.tech) (`@prisma/adapter-libsql`), a hosted
  SQLite-compatible database — same schema and query code either way, see
  [`lib/dbAdapter.ts`](./lib/dbAdapter.ts)
- **Auth:** mocked — pick one of three seeded accounts, no password. Sessions are an HMAC-signed
  httpOnly cookie (see [`lib/session.ts`](./lib/session.ts))
- **Styling:** Tailwind CSS v4
- **Tests:** Vitest

## Seeded accounts

The seed script creates three users you can switch between from the login screen:

| Name | Email |
| --- | --- |
| Alice Chen | alice@example.com |
| Bob Martinez | bob@example.com |
| Carla Devi | carla@example.com |

There are no passwords — this is intentionally mocked auth per the assignment scope. A
"Welcome to Docs" document is seeded, owned by Alice and shared with Bob (edit access), so a
sharing relationship exists out of the box for reviewers.

## Local setup

Requirements: Node 20+ and npm.

```bash
npm install
cp .env.example .env     # then fill in the two values below
npx prisma migrate dev   # creates prisma/dev.db and applies the schema
npm run db:seed          # creates the three seeded users + example document
npm run dev
```

Open http://localhost:3000 — you'll land on the login screen. Pick any seeded account.

`.env.example` is a blank template for local dev, fill in `.env` with:

```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="any-random-string-for-local-dev"
```

Leave `TURSO_AUTH_TOKEN` blank locally — it's only read when `DATABASE_URL` points at a
`libsql://` Turso database (i.e. in production), not a local file. `SESSION_SECRET` signs the
login cookie (HMAC); any string works for local dev, use a real random value in production.

### Running tests

```bash
npm test
```

15 tests across two files:

- `lib/__tests__/markdownToTiptap.test.ts` — unit tests for the Markdown → TipTap JSON
  converter used by file import (headings, bold/italic marks, lists, edge cases)
- `lib/__tests__/access.test.ts` — the sharing/permission logic (`getDocumentAccess`,
  `canView`, `canEdit`) run against a real throwaway SQLite database seeded with an owner,
  an editor, a viewer, and an unrelated user, asserting each gets the right access level

## Feature walkthrough

### Document creation & editing
- **New document** on the dashboard creates a blank doc and opens the editor.
- Title is an inline editable field in the editor header; content and title both autosave
  (debounced ~700ms after you stop typing) via `PATCH /api/documents/:id`.
- Formatting: bold, italic, underline, H1–H3, paragraph, bulleted list, numbered list,
  blockquote, undo/redo.
- Reopening a document (or refreshing) reloads the saved TipTap JSON from SQLite.

### File upload / import
- "Upload .txt / .md" on the dashboard accepts `.txt`, `.md`, and `.markdown` files (2MB limit,
  enforced both in the file picker's `accept` attribute and server-side).
- `.md`/`.markdown` files are parsed with `marked` and converted to TipTap JSON, preserving
  headings, bold/italic, and lists (see [`lib/markdownToTiptap.ts`](./lib/markdownToTiptap.ts)).
- `.txt` files are split into paragraphs on blank lines.
- A successful import creates a new document owned by the uploader and opens it directly.
- Other file types are rejected with a clear error message, both in the UI (file picker filter)
  and this README.

### Sharing
- Only the document owner sees the **Share** button and can grant or revoke access.
- Share by the other user's email; permission is either "can edit" or "can view".
- The dashboard splits documents into **Owned by you** and **Shared with you**, and shared
  entries show who shared it and at what permission level.
- View-only users see a read-only editor (no toolbar, disabled title field, "View only" badge)
  — enforced both in the UI and server-side on every API route via
  [`lib/access.ts`](./lib/access.ts).

### Persistence
- Documents (title, TipTap JSON content, owner) and shares (document, user, permission) are
  stored in SQLite via Prisma. Everything survives a refresh or server restart.

## Known limitations / what I'd build next

- **No real-time collaboration.** Two people editing the same document simultaneously will
  overwrite each other's autosave (last write wins). Out of scope for this timebox; a next step
  would be Yjs + TipTap's collaboration extension.
- **No version history** — each save overwrites the previous content. Given more time I'd add
  periodic snapshots.
- **Import is Markdown/plain-text only** — no `.docx` support. `.docx` parsing (e.g. via
  `mammoth`) was cut to keep the import path simple and reliable within the timebox.
- **Sharing is a flat owner/editor/viewer model**, not role-based or link-based (no "anyone with
  the link" access). Deliberately simple per the assignment's "does not need to be
  enterprise-grade" guidance.
- **Auth is mocked** — fine for a reviewable demo, not for production.

## Deployment

**Deployed on Vercel, database on [Turso](https://turso.tech).** Vercel's serverless functions
have no persistent or shared filesystem, so a plain SQLite file (which is what local dev uses)
can't live there — writes from one function invocation wouldn't reliably be visible to the next.
Turso is a hosted, serverless-friendly SQLite-compatible database (same "sqlite" Prisma provider,
different driver adapter — see [`lib/dbAdapter.ts`](./lib/dbAdapter.ts)), so the app's data
actually persists correctly on Vercel. This tradeoff is explained in more detail in
[ARCHITECTURE.md](./ARCHITECTURE.md).

One wrinkle: Prisma's migration engine (`prisma migrate deploy`) doesn't understand Turso's
`libsql://` connection scheme — it only works against local SQLite files or classic databases.
[`scripts/migrate.ts`](./scripts/migrate.ts) works around this: it detects the scheme and either
delegates to `prisma migrate deploy` (local file) or applies each `migration.sql` directly over
the libSQL client with its own small applied-migrations tracking table (Turso). `npm run build`
calls this automatically, so it's transparent either way.

### Steps to redeploy this yourself

1. **Create a free Turso database** at [turso.tech](https://turso.tech) (GitHub login, no card).
   From the database's "Connect" page, copy the **Database URL** (`libsql://...`) and generate
   an **auth token**.
2. **Apply the schema and seed data** once, locally, against that database:
   ```bash
   DATABASE_URL="libsql://your-db.turso.io" TURSO_AUTH_TOKEN="your-token" npm run db:migrate:deploy
   DATABASE_URL="libsql://your-db.turso.io" TURSO_AUTH_TOKEN="your-token" npm run db:seed
   ```
3. **Push this repo to GitHub**, then import it at [vercel.com/new](https://vercel.com/new) —
   Vercel auto-detects Next.js, no config needed.
4. **Set three environment variables** in the Vercel project (Settings → Environment Variables):

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | `libsql://your-db.turso.io` (bare URL, no query params) |
   | `TURSO_AUTH_TOKEN` | the auth token from step 1 |
   | `SESSION_SECRET` | any long random string |

5. **Deploy.** `npm run build` runs `prisma generate`, the migrate script (no-ops since the
   schema was already applied in step 2, matching what step 2's tracking table recorded), then
   `next build`.

An alternative, code-free-change path is also included: [render.yaml](./render.yaml) deploys to
Render with a plain SQLite file on Render's own filesystem instead of Turso — see the comment at
the top of that file for the tradeoff (no persistent disk on Render's free tier).
