import { prisma } from "@/lib/prisma";

export type DocumentAccess = "OWNER" | "EDIT" | "VIEW" | "NONE";

export async function getDocumentAccess(
  documentId: string,
  userId: string
): Promise<DocumentAccess> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      ownerId: true,
      shares: { where: { userId }, select: { permission: true } },
    },
  });
  if (!doc) return "NONE";
  if (doc.ownerId === userId) return "OWNER";
  const share = doc.shares[0];
  if (!share) return "NONE";
  return share.permission;
}

export function canView(access: DocumentAccess) {
  return access === "OWNER" || access === "EDIT" || access === "VIEW";
}

export function canEdit(access: DocumentAccess) {
  return access === "OWNER" || access === "EDIT";
}
