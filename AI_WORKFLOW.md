# AI workflow note

## Tools used

**Claude Code** (Sonnet 5, Anthropic's CLI agent) was the primary tool for this assignment —
used for scaffolding, writing application code, running commands, and browser-based manual
verification, in a single continuous session. No other AI coding tool was used.

## Where AI materially sped up the work

- **Scaffolding and boilerplate.** Generating the Next.js project, wiring up Prisma with the
  (very recently changed) Prisma 7 driver-adapter API, and writing the repetitive parts of the
  API routes (auth checks, zod validation, consistent error shapes across ~8 route handlers) is
  exactly the kind of work AI removes friction from — the pattern is the same eight times, and
  having it written consistently the first time avoided a later cleanup pass.
- **The Markdown→TipTap converter.** Writing a small recursive converter from `marked`'s token
  tree to TipTap's JSON document schema (handling nested marks like `**bold *and italic***`,
  heading-level clamping, list items containing block content) is fiddly, well-specified, easy
  to get subtly wrong, and easy to unit test. AI produced a first version quickly; I verified it
  by writing tests against real edge cases (nested marks, empty input, heading depth > 3) and by
  running an actual `.md` file through the live `/api/documents/import` endpoint and reading the
  resulting document back in the browser, rather than trusting the code by inspection.
- **Debugging a breaking API change.** Prisma 7 (released very recently) removed inline
  datasource URLs from `schema.prisma` in favor of adapter-based `PrismaClient` construction —
  something neither the assignment nor most existing tutorials reflect yet. AI read the actual
  error message and the installed package's `.d.ts` files to figure out the new API shape rather
  than guessing, which was faster than searching for currently-nonexistent documentation.
- **A mid-build deployment pivot (Render → Vercel + Turso).** Deployment started on Render, but
  the account hit a card-verification wall, so the plan switched to Vercel mid-session. That
  exposed a real bug in the original design: Vercel has no persistent filesystem, so the SQLite
  file approach wouldn't reliably persist writes. AI flagged this *before* deploying (not after
  discovering broken persistence in review) and proposed swapping to Turso. It then discovered,
  by actually running `prisma migrate deploy` against a real Turso database and reading the exact
  error (`P1013: ... scheme is not recognized`), that Prisma's migration engine — unlike the
  generated Client — doesn't support the `libsql://` scheme at all, despite the driver adapter
  class's type signature suggesting it should. Rather than accept a workaround based on
  assumption, it wrote a small standalone script that applies migrations directly over the
  libSQL client with its own tracking table, and proved it works (and is idempotent on a second
  run) against the live database before wiring it into the build.

## What AI-generated output I changed or rejected

- **Tailwind's `prose` typography plugin.** The first draft of the editor styling reached for
  `@tailwindcss/typography`'s `prose` classes. I rejected that in favor of a small hand-written
  `.doc-content` CSS block in `globals.css`, because Tailwind v4's typography plugin setup is
  CSS-config-based and would have added a dependency and a config step for styling that's small
  enough to just write directly — fewer moving parts for the same visual result.
- **A `useRef`-during-render pattern** in `DocEditor.tsx` for memoizing the parsed initial TipTap
  content tripped the React Compiler ESLint rule (`react-hooks/refs`) during a lint pass. Fixed
  by switching to `useState(() => JSON.parse(...))`'s lazy initializer instead, which is the
  correct idiom and doesn't read a ref during render.
- **Server actions vs. API routes.** AI's first instinct leaned toward Next.js server actions for
  mutations. I kept plain REST route handlers instead, since the assignment asks for full-stack
  "API design" to be visible and testable, and route handlers are more legible to a reviewer
  skimming the code than server actions threaded through client components.

## How I verified correctness, UX quality, and reliability

- **Static verification on every meaningful change:** `tsc --noEmit`, `eslint`, and a production
  `next build` all pass clean — not just "the file compiles," but the actual `next build`
  pipeline including Prisma client generation and migration deploy.
- **Automated tests**, not just written but run: a real integration test spins up a throwaway
  SQLite database, seeds an owner/editor/viewer/unrelated-user, and asserts the sharing
  permission logic (`getDocumentAccess`) resolves correctly for each — this is the piece of logic
  where a bug would silently leak document access, so it's covered by a real test against a real
  database rather than a mock.
- **Manual browser verification of the actual golden path**, using a browser automation tool
  driving a real Chromium instance against the running dev server — not just reading the code:
  logged in as each seeded user, created and edited a document, confirmed content survived a
  hard page reload, opened the Share dialog and granted both edit and view access, then switched
  users and confirmed the editor toolbar disappears and the title field is disabled for the
  view-only user (server-enforced, not just hidden by CSS).
- **The file-upload flow was verified end-to-end via a real HTTP request** (multipart form POST
  with a session cookie) rather than only by code review, because the assignment's browser
  automation surface can't drive a native OS file picker dialog. The resulting document was then
  opened in the browser to confirm the imported heading/bold/italic/list content actually renders
  correctly in the live editor — not just that the API returned 201.
- **The Turso swap was verified against the real production database, not just the code path.**
  After wiring in the new adapter, AI ran `npm run build` and `npm start` (the actual production
  server, not `next dev`) with `DATABASE_URL` pointed at the live Turso instance, then drove the
  running app through the browser: logged in, edited a document, hard-reloaded, and confirmed the
  edit read back correctly from Turso. One of those checks caught a real issue immediately — a
  first attempt showed the edit hadn't saved, which turned out to be a browser-automation
  click/focus timing artifact (confirmed by retrying with a precisely targeted click and watching
  the text appear before navigating away), not a database bug — the kind of false lead that's
  only distinguishable from a real bug by actually re-running the check, not by re-reading the
  code.
- I did not accept any AI claim of "this works" without independently triggering the behavior
  (running the test, loading the page, reading the actual API response) — the verification steps
  above are what actually happened in this session, not a description of a workflow I intend to
  follow.
