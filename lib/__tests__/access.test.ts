import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DocumentAccess } from "@/lib/access";

// lib/access.ts pulls in the lib/prisma.ts singleton, which binds to
// process.env.DATABASE_URL at import time. Everything that touches it is
// imported dynamically below, *after* DATABASE_URL is pointed at a throwaway
// test database, so these tests never read or write the real dev.db.
let prisma: import("@/app/generated/prisma/client").PrismaClient;
let getDocumentAccess: (documentId: string, userId: string) => Promise<DocumentAccess>;
let canView: (access: DocumentAccess) => boolean;
let canEdit: (access: DocumentAccess) => boolean;
let tempDir: string;

const owner = { name: "Owner Olivia", email: "owner@test.local" };
const editor = { name: "Editor Ed", email: "editor@test.local" };
const viewer = { name: "Viewer Vic", email: "viewer@test.local" };
const stranger = { name: "Stranger Sam", email: "stranger@test.local" };

let documentId: string;
let ownerId: string, editorId: string, viewerId: string, strangerId: string;

beforeAll(async () => {
  tempDir = mkdtempSync(path.join(tmpdir(), "docs-access-test-"));
  const dbPath = path.join(tempDir, "test.db");
  process.env.DATABASE_URL = `file:${dbPath}`;

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    env: process.env,
    stdio: "pipe",
  });

  const { PrismaClient } = await import("@/app/generated/prisma/client");
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  prisma = new PrismaClient({ adapter });

  ({ getDocumentAccess, canView, canEdit } = await import("@/lib/access"));

  const [ownerUser, editorUser, viewerUser, strangerUser] = await Promise.all([
    prisma.user.create({ data: owner }),
    prisma.user.create({ data: editor }),
    prisma.user.create({ data: viewer }),
    prisma.user.create({ data: stranger }),
  ]);
  ownerId = ownerUser.id;
  editorId = editorUser.id;
  viewerId = viewerUser.id;
  strangerId = strangerUser.id;

  const doc = await prisma.document.create({
    data: { title: "Shared spec", ownerId },
  });
  documentId = doc.id;

  await prisma.documentShare.createMany({
    data: [
      { documentId, userId: editorId, permission: "EDIT" },
      { documentId, userId: viewerId, permission: "VIEW" },
    ],
  });
});

afterAll(async () => {
  await prisma?.$disconnect();
  // better-sqlite3 can hold the file handle briefly after disconnect on Windows.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      rmSync(tempDir, { recursive: true, force: true });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
});

describe("getDocumentAccess", () => {
  it("grants OWNER access to the document creator", async () => {
    expect(await getDocumentAccess(documentId, ownerId)).toBe("OWNER");
  });

  it("grants EDIT access to a user shared with edit permission", async () => {
    expect(await getDocumentAccess(documentId, editorId)).toBe("EDIT");
  });

  it("grants VIEW access to a user shared with view permission", async () => {
    expect(await getDocumentAccess(documentId, viewerId)).toBe("VIEW");
  });

  it("denies access to a user the document was never shared with", async () => {
    expect(await getDocumentAccess(documentId, strangerId)).toBe("NONE");
  });

  it("returns NONE for a nonexistent document", async () => {
    expect(await getDocumentAccess("does-not-exist", ownerId)).toBe("NONE");
  });
});

describe("canView / canEdit", () => {
  it("allows viewing for OWNER, EDIT, and VIEW access", () => {
    expect(canView("OWNER")).toBe(true);
    expect(canView("EDIT")).toBe(true);
    expect(canView("VIEW")).toBe(true);
    expect(canView("NONE")).toBe(false);
  });

  it("allows editing only for OWNER and EDIT access", () => {
    expect(canEdit("OWNER")).toBe(true);
    expect(canEdit("EDIT")).toBe(true);
    expect(canEdit("VIEW")).toBe(false);
    expect(canEdit("NONE")).toBe(false);
  });
});
