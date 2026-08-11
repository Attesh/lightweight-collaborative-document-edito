# Architecture note

## Scope and priorities

The assignment explicitly rewards depth over coverage, so I picked four areas to get right and
kept everything else deliberately thin:

1. **The editing experience** — formatting needs to actually feel usable, not just technically
   present. TipTap (ProseMirror) gives real bold/italic/underline/headings/lists with a toolbar
   that reflects the current selection state, not a toy `contentEditable` div.
2. **Access control that's actually enforced**, not just displayed. Every document API route
   re-derives the caller's access level server-side (`lib/access.ts`) rather than trusting the
   client. View-only users get a genuinely read-only editor, not a client-side-only restriction.
3. **A file import that produces a real editable document**, not a text blob. Markdown files are
   parsed into the same TipTap JSON schema the editor already speaks, so headings/bold/lists
   survive the import and are immediately editable — this seemed more product-relevant than a
   generic "attach a file" flow.
4. **Persistence and reload correctness** — content round-trips through SQLite as TipTap's own
   JSON document format, so nothing is lossy between save and reopen.

Everything else — real-time collaboration, version history, `.docx` import, role-based
permissions beyond edit/view — was cut. They're listed in the README as explicit next steps, not
silently dropped.

## Data model

Three tables, via Prisma:

- `User` — seeded accounts (id, name, email). No password field; auth is mocked by design (see
  below).
- `Document` — title, `content` (TipTap JSON, stored as a string), `ownerId`, timestamps.
- `DocumentShare` — join table between `Document` and `User` with a `permission` enum
  (`VIEW` | `EDIT`), unique on `(documentId, userId)` so re-sharing with the same person updates
  their permission instead of creating duplicate rows.

Access to a document resolves to one of `OWNER | EDIT | VIEW | NONE`
(`lib/access.ts:getDocumentAccess`) — the owner always has full access regardless of whether a
`DocumentShare` row exists; everyone else's access comes from their share row, if any.

## Why SQLite + a driver adapter instead of Postgres/Supabase

The assignment explicitly allows SQLite for this scope, and it removes an entire category of
setup friction (no hosted DB to provision, no connection string to manage) for a project of this
size. Prisma 7 changed how SQLite is wired up — the schema file no longer holds a connection URL,
and `PrismaClient` now takes a driver `adapter` instead of inferring one from the schema. I used
`@prisma/adapter-better-sqlite3`, which is a synchronous, natively-compiled SQLite driver with
prebuilt binaries for common platforms (no native compilation needed on Windows dev or Render's
Linux build image).

The real tradeoff is deployment, not development: SQLite is a single file, which means it only
works cleanly on a host with a persistent, single-writer filesystem. That's fine for a demo with
one Render instance and no autoscaling. Render's free instance type doesn't support attaching a
persistent disk, so as deployed the SQLite file lives on the container's local filesystem —
survives restarts, wiped on redeploy (the seed script re-runs on every start so reviewer accounts
always come back). `render.yaml` documents how to add a real persistent disk if upgraded to a
paid instance. None of this would survive multi-instance scaling or a platform with an ephemeral
per-request filesystem (e.g. plain Vercel serverless functions) without moving to a networked
SQLite service like Turso or a hosted Postgres — a one-line swap in `lib/prisma.ts` (the adapter
is the only database-specific code) if this ever needed to grow past a single-instance demo.

## Auth: mocked on purpose

The assignment explicitly allows "seeded accounts, mocked auth, or a lightweight login flow."
Building real password auth (hashing, reset flows, session invalidation) would have consumed a
meaningful chunk of the timebox on a supporting feature the assignment doesn't evaluate. Instead:

- Three seeded users, login is "pick an account."
- Sessions are an HMAC-SHA256-signed cookie (`lib/session.ts`) — not a JWT library, just enough
  to prevent trivial cookie tampering (a user editing the cookie value to impersonate another
  seeded user) without pulling in a dependency for something this small. `SESSION_SECRET` is an
  env var; the committed `.env` value is for local dev only.
- Every API route still calls `getCurrentUser()` and checks document access independently — the
  mocked-ness of login doesn't weaken the authorization checks downstream.

## API design

Plain REST-ish route handlers under `app/api/`, not server actions, so the data layer has a
clear, testable boundary and the client code is ordinary `fetch` calls. Each document mutation
route (`PATCH /api/documents/:id`, the shares routes) re-checks access on every request rather
than caching a permission check from an earlier request — slightly more DB reads, but it means
a permission revoked mid-session takes effect on the very next save instead of silently allowing
one more write.

## Autosave, not a save button

Title and content both save automatically ~700ms after the user stops typing
(`components/DocEditor.tsx`), with a small status indicator ("Saving…" / "Saved" / "Failed to
save"). This matches how Google Docs actually behaves and avoids a whole class of "I forgot to
click save" bug reports, at the cost of not having an explicit undo-my-unsaved-changes escape
hatch — acceptable for this scope since TipTap's own undo/redo covers in-session mistakes.

## Testing

One test file exercises the sharing/permission logic end-to-end against a real (throwaway)
SQLite database — seeding an owner, an editor, a viewer, and an unrelated user, then asserting
`getDocumentAccess` resolves correctly for each. This is the piece of logic where a subtle bug
(e.g. an off-by-one in an enum comparison, or forgetting the `OWNER` case) would silently leak
document access, so it's the one most worth pinning down with a real test rather than manual
clicking. A second file unit-tests the Markdown→TipTap converter, since it's pure and has several
edge cases (nested marks, heading-level clamping, empty input) worth locking down.

## What I'd do with another 2–4 hours

- Real-time presence/collaboration cursors via Yjs, since the data model (TipTap JSON) is already
  compatible with `@tiptap/extension-collaboration`.
- Document version history (periodic snapshots on save, with a simple diff/restore UI).
- `.docx` import via `mammoth` alongside the existing Markdown/plain-text path.
- Move `SESSION_SECRET` out of a committed `.env` and into deployment-only secret storage (it's
  already environment-variable-driven, just not yet split from the dev convenience file).
