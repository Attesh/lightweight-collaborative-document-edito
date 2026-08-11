import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDocumentAccess } from "@/lib/access";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await getDocumentAccess(id, user.id);
  if (access !== "OWNER") return NextResponse.json({ error: "Only the owner can view sharing settings" }, { status: 403 });

  const [shares, allUsers] = await Promise.all([
    prisma.documentShare.findMany({
      where: { documentId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({ where: { NOT: { id: user.id } }, select: { id: true, name: true, email: true } }),
  ]);

  return NextResponse.json({ shares, candidates: allUsers });
}

const shareSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  permission: z.enum(["VIEW", "EDIT"]).default("EDIT"),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await getDocumentAccess(id, user.id);
  if (access !== "OWNER") return NextResponse.json({ error: "Only the owner can share this document" }, { status: 403 });

  const parsed = shareSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!targetUser) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  }
  if (targetUser.id === user.id) {
    return NextResponse.json({ error: "You already own this document" }, { status: 400 });
  }

  const share = await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: id, userId: targetUser.id } },
    update: { permission: parsed.data.permission },
    create: { documentId: id, userId: targetUser.id, permission: parsed.data.permission },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ share }, { status: 201 });
}
