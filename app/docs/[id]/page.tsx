import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDocumentAccess, canView } from "@/lib/access";
import { TopNav } from "@/components/TopNav";
import { DocEditor } from "@/components/DocEditor";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const access = await getDocumentAccess(id, user.id);
  if (!canView(access)) notFound();

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  if (!doc) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav user={{ name: user.name, email: user.email }} />
      <DocEditor
        documentId={doc.id}
        initialTitle={doc.title}
        initialContent={doc.content}
        access={access}
        owner={doc.owner}
      />
    </div>
  );
}
