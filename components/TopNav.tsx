"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function TopNav({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/docs" className="text-lg font-semibold text-zinc-900">
          Docs
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">
            {user.name} <span className="text-zinc-400">({user.email})</span>
          </span>
          <button
            onClick={logout}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Switch user
          </button>
        </div>
      </div>
    </header>
  );
}
