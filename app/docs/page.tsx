import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TopNav } from "@/components/TopNav";
import { DocumentsDashboard } from "@/components/DocumentsDashboard";

export default async function DocsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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

  const shared = sharedWith.map((s) => ({
    id: s.document.id,
    title: s.document.title,
    updatedAt: s.document.updatedAt.toISOString(),
    createdAt: s.document.createdAt.toISOString(),
    permission: s.permission,
    owner: s.document.owner,
  }));

  const ownedSerialized = owned.map((d) => ({
    id: d.id,
    title: d.title,
    updatedAt: d.updatedAt.toISOString(),
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav user={{ name: user.name, email: user.email }} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <DocumentsDashboard initialOwned={ownedSerialized} initialShared={shared} />
      </main>
    </div>
  );
}
