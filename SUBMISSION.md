# Submission — Docs (Ajaia AI-Native Full Stack Developer Assignment)

**Candidate:** Zeeshan Ali (zeshan.baltistan@gmail.com)

## What's included in this folder

- **Source code** — the full Next.js application (`app/`, `components/`, `lib/`, `prisma/`).
- **`README.md`** — local setup/run instructions, seeded test accounts, feature walkthrough,
  known limitations, deployment steps.
- **`ARCHITECTURE.md`** — the architecture note: what was prioritized, why, and the tradeoffs
  behind the data model, auth approach, and SQLite choice.
- **`AI_WORKFLOW.md`** — the AI usage note: which tools were used, where they helped, what was
  changed or rejected, and how correctness was verified.
- **`SUBMISSION.md`** — this file.
- **`render.yaml`** — deployment blueprint for Render (see README's Deployment section).
- **`.env.example`** — the two environment variables the app needs.
- Automated tests under `lib/__tests__/` (run with `npm test`).

## Live deployment

_Add the deployed URL here before sharing this folder._ `render.yaml` in this repo is a ready
Render Blueprint — see the "Deployment" section of README.md for the exact steps.

## Test accounts for reviewers

No passwords — the login screen lists three seeded accounts, click any one to sign in:

| Name | Email |
| --- | --- |
| Alice Chen | alice@example.com |
| Bob Martinez | bob@example.com |
| Carla Devi | carla@example.com |

A "Welcome to Docs" document is pre-seeded, owned by Alice and shared with Bob (edit access), so
the sharing flow is visible immediately without setup. To see the view-only flow, share a
document with Carla at "can view" permission (as Alice, via the Share button) and reload as
Carla.

## Walkthrough video

_Add the Loom/YouTube link here, and also drop it in a plain `walkthrough-video-url.txt` file
per the assignment's deliverable list._

## Status: what's working vs. incomplete

**Working end-to-end**, verified by both automated tests and manual browser testing:
- Create, rename, and edit documents with rich-text formatting (bold, italic, underline, H1–H3,
  bulleted/numbered lists, blockquotes, undo/redo).
- Content and title autosave and correctly reload after a hard refresh.
- Upload a `.txt` or `.md` file to create a new, fully-editable document (verified including
  that Markdown headings/bold/italic/lists convert correctly).
- Sharing: owner grants view or edit access by email; dashboard distinguishes owned vs. shared
  documents; permission is enforced server-side, not just hidden in the UI (a view-only user
  gets a genuinely read-only editor).
- Deleting an owned document.

**Intentionally deprioritized / not built** (see ARCHITECTURE.md for the reasoning):
- Real-time collaboration (multi-user live editing, presence indicators).
- Document version history.
- `.docx` import (only `.txt`/`.md`/`.markdown` are supported, stated in both the UI and README).
- Role-based permissions beyond a flat owner/editor/viewer model.
- Real password-based auth (mocked seeded-account login per the assignment's allowed scope).

**What I'd build next with another 2–4 hours:** real-time collaboration cursors via Yjs +
TipTap's collaboration extension (the data model already stores TipTap-compatible JSON), simple
version snapshots on save, and `.docx` import via `mammoth`.
