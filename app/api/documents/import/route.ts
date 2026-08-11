import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { markdownToTiptapJSON, plainTextToTiptapJSON } from "@/lib/markdownToTiptap";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_EXTENSIONS = [".txt", ".md", ".markdown"];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const lowerName = file.name.toLowerCase();
  const extension = ALLOWED_EXTENSIONS.find((ext) => lowerName.endsWith(ext));
  if (!extension) {
    return NextResponse.json(
      { error: `Unsupported file type. Supported: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is too large (2MB limit)" }, { status: 400 });
  }

  const text = await file.text();
  const isMarkdown = extension === ".md" || extension === ".markdown";
  const json = isMarkdown ? markdownToTiptapJSON(text) : plainTextToTiptapJSON(text);

  const title = file.name.replace(/\.[^.]+$/, "").trim() || "Imported document";

  const doc = await prisma.document.create({
    data: {
      title,
      ownerId: user.id,
      content: JSON.stringify(json),
    },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
