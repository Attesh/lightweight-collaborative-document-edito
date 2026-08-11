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
- **Database:** SQLite via Prisma 7, using the `@prisma/adapter-better-sqlite3` driver adapter
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

`.env.example` is a blank template for two variables — fill in `.env` with:

```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="any-random-string-for-local-dev"
```

`SESSION_SECRET` signs the login cookie (HMAC). The example value is fine for local dev; set a
real random value in production (Render's Blueprint auto-generates one — see Deployment below).

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

See [render.yaml](./render.yaml) for a Render Blueprint that runs on Render's **free** instance
type. Render's free plan does not support persistent disks (that needs a paid "Starter" instance
or higher), so by default `DATABASE_URL` points at a SQLite file on the container's local
filesystem: it survives restarts and sleep/wake, but is wiped on every new deploy. The seed
script re-runs on every start, so the seeded reviewer accounts always come back even after a
redeploy — only real documents created since the last deploy would be lost. This tradeoff (and
how to remove it by upgrading to a paid instance + disk) is documented inline in `render.yaml`
and in [ARCHITECTURE.md](./ARCHITECTURE.md).

Steps:
1. Push this repo to GitHub.
2. Sign up / log in at [render.com](https://render.com) (free, no card required for the free
   plan).
3. In the Render dashboard: "New +" → "Blueprint", connect the GitHub repo — Render reads
   `render.yaml` automatically and shows the one `docs-editor` service it defines.
4. Click "Deploy Blueprint". First build takes a few minutes (installs deps, generates the
   Prisma client, builds Next.js). The start command then runs `prisma migrate deploy` and the
   seed script before starting the server.
5. Once live, Render gives you a URL like `https://docs-editor-xxxx.onrender.com` — drop that
   into this README and `SUBMISSION.md`.

Note: Render's free instances spin down after 15 minutes of inactivity and take ~30–60s to wake
up on the next request — the first load after idling will be slow, not broken.
