"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type OwnedDoc = { id: string; title: string; updatedAt: string; createdAt: string };
type SharedDoc = OwnedDoc & {
  permission: "VIEW" | "EDIT";
  owner: { name: string; email: string };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DocumentsDashboard({
  initialOwned,
  initialShared,
}: {
  initialOwned: OwnedDoc[];
  initialShared: SharedDoc[];
}) {
  const router = useRouter();
  const [owned, setOwned] = useState(initialOwned);
  const [shared] = useState(initialShared);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function createDocument() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled document" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create document");
      router.push(`/docs/${data.document.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create document");
      setCreating(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      router.push(`/docs/${data.document.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setUploading(false);
    }
  }

  async function deleteDocument(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    const prev = owned;
    setOwned(owned.filter((d) => d.id !== id));
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setOwned(prev);
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete document");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Your documents</h1>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {uploading ? "Importing…" : "Upload .txt / .md"}
          </button>
          <button
            onClick={createDocument}
            disabled={creating}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {creating ? "Creating…" : "New document"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Owned by you</h2>
        {owned.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No documents yet. Create one or upload a file to get started.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {owned.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3">
                <a href={`/docs/${doc.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{doc.title}</p>
                  <p className="text-xs text-zinc-500">Updated {formatDate(doc.updatedAt)}</p>
                </a>
                <button
                  onClick={() => deleteDocument(doc.id)}
                  className="ml-3 shrink-0 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Shared with you</h2>
        {shared.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nothing has been shared with you yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {shared.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3">
                <a href={`/docs/${doc.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{doc.title}</p>
                  <p className="text-xs text-zinc-500">
                    Shared by {doc.owner.name} · {doc.permission === "EDIT" ? "can edit" : "can view"} ·
                    Updated {formatDate(doc.updatedAt)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
