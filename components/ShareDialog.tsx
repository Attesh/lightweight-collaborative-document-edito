"use client";

import { useEffect, useState } from "react";

type Share = {
  id: string;
  permission: "VIEW" | "EDIT";
  user: { id: string; name: string; email: string };
};
type Candidate = { id: string; name: string; email: string };

export function ShareDialog({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [shares, setShares] = useState<Share[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"VIEW" | "EDIT">("EDIT");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${documentId}/shares`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setShares(data.shares ?? []);
        setCandidates(data.candidates ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function addShare(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permission }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to share");
      setShares((prev) => {
        const withoutExisting = prev.filter((s) => s.user.email !== data.share.user.email);
        return [...withoutExisting, data.share];
      });
      setEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to share");
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(shareId: string) {
    const prev = shares;
    setShares(shares.filter((s) => s.id !== shareId));
    const res = await fetch(`/api/documents/${documentId}/shares/${shareId}`, { method: "DELETE" });
    if (!res.ok) setShares(prev);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Share document</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={addShare} className="mt-4 flex gap-2">
          <input
            type="email"
            required
            list="share-candidates"
            placeholder="person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <datalist id="share-candidates">
            {candidates.map((c) => (
              <option key={c.id} value={c.email} />
            ))}
          </datalist>
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as "VIEW" | "EDIT")}
            className="rounded-md border border-zinc-300 px-2 py-2 text-sm"
          >
            <option value="EDIT">Can edit</option>
            <option value="VIEW">Can view</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Share
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">People with access</h3>
          {loading ? (
            <p className="mt-2 text-sm text-zinc-400">Loading…</p>
          ) : shares.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-400">Not shared with anyone yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-100">
              {shares.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-zinc-900">{s.user.name}</p>
                    <p className="text-xs text-zinc-500">
                      {s.user.email} · {s.permission === "EDIT" ? "can edit" : "can view"}
                    </p>
                  </div>
                  <button
                    onClick={() => revoke(s.id)}
                    className="text-xs text-zinc-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
