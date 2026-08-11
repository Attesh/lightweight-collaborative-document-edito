"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SeedUser = { id: string; name: string; email: string };

export function LoginForm({ users }: { users: SeedUser[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function login(userId: string) {
    setLoadingId(userId);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Login failed");
      }
      router.push("/docs");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setLoadingId(null);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      {users.map((u) => (
        <button
          key={u.id}
          onClick={() => login(u.id)}
          disabled={loadingId !== null}
          className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-left transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
        >
          <span>
            <span className="block text-sm font-medium text-zinc-900">{u.name}</span>
            <span className="block text-xs text-zinc-500">{u.email}</span>
          </span>
          <span className="text-xs text-zinc-400">
            {loadingId === u.id ? "Signing in…" : "Continue →"}
          </span>
        </button>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
