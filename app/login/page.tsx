import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const current = await getCurrentUser();
  if (current) redirect("/docs");

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Docs</h1>
        <p className="mt-1 text-sm text-zinc-500">
          A lightweight collaborative document editor. Pick a seeded account to continue — this
          demo uses mocked auth, no password required.
        </p>
        <LoginForm users={users.map((u) => ({ id: u.id, name: u.name, email: u.email }))} />
      </div>
    </div>
  );
}
