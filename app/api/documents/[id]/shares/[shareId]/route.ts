import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDocumentAccess } from "@/lib/access";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; shareId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, shareId } = await ctx.params;
  const access = await getDocumentAccess(id, user.id);
  if (access !== "OWNER") return NextResponse.json({ error: "Only the owner can revoke access" }, { status: 403 });

  const share = await prisma.documentShare.findUnique({ where: { id: shareId } });
  if (!share || share.documentId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.documentShare.delete({ where: { id: shareId } });
  return NextResponse.json({ ok: true });
}
