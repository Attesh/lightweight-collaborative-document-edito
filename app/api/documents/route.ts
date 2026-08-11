import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [owned, sharedWith] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, createdAt: true },
    }),
    prisma.documentShare.findMany({
      where: { userId: user.id },
      orderBy: { document: { updatedAt: "desc" } },
      select: {
        permission: true,
        document: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
            createdAt: true,
            owner: { select: { name: true, email: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    owned,
    shared: sharedWith.map((s) => ({ ...s.document, permission: s.permission, owner: s.document.owner })),
  });
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200).default("Untitled document"),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const doc = await prisma.document.create({
    data: { title: parsed.data.title, ownerId: user.id },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
