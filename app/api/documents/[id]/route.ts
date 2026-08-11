import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canEdit, canView, getDocumentAccess } from "@/lib/access";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await getDocumentAccess(id, user.id);
  if (!canView(access)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ document: doc, access });
}

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().min(1).max(2_000_000).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await getDocumentAccess(id, user.id);
  if (access === "NONE") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEdit(access)) return NextResponse.json({ error: "You only have view access" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (parsed.data.content) {
    try {
      JSON.parse(parsed.data.content);
    } catch {
      return NextResponse.json({ error: "content must be valid JSON" }, { status: 400 });
    }
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const doc = await prisma.document.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ document: doc });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await getDocumentAccess(id, user.id);
  if (access === "NONE") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (access !== "OWNER") return NextResponse.json({ error: "Only the owner can delete this document" }, { status: 403 });

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
