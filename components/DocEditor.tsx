"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Editor } from "@/components/Editor";
import { ShareDialog } from "@/components/ShareDialog";
import type { DocumentAccess } from "@/lib/access";

type Owner = { id: string; name: string; email: string };

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function DocEditor({
  documentId,
  initialTitle,
  initialContent,
  access,
  owner,
}: {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  access: DocumentAccess;
  owner: Owner;
}) {
  const editable = access === "OWNER" || access === "EDIT";
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [shareOpen, setShareOpen] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialContentJSON] = useState(() => JSON.parse(initialContent));

  const scheduleSave = useCallback(
    (patch: { title?: string; content?: string }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setStatus("saving");
        try {
          const res = await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          if (!res.ok) throw new Error();
          setStatus("saved");
        } catch {
          setStatus("error");
        }
      }, 700);
    },
    [documentId]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (editable) scheduleSave({ title: value || "Untitled document" });
  }

  function handleContentChange(json: unknown) {
    if (!editable) return;
    scheduleSave({ content: JSON.stringify(json) });
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/docs" className="shrink-0 text-sm text-zinc-400 hover:text-zinc-700">
              ← Back
            </Link>
            <input
              value={title}
              disabled={!editable}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="min-w-0 flex-1 truncate rounded px-1 text-lg font-medium text-zinc-900 focus:bg-zinc-50 focus:outline-none disabled:bg-transparent"
              aria-label="Document title"
            />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-zinc-400">
              {status === "saving" && "Saving…"}
              {status === "saved" && "Saved"}
              {status === "error" && "Failed to save"}
              {status === "idle" && (access === "OWNER" ? "" : `Owned by ${owner.name}`)}
            </span>
            {!editable && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                View only
              </span>
            )}
            {access === "OWNER" && (
              <button
                onClick={() => setShareOpen(true)}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Share
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-6">
        <Editor
          content={initialContentJSON}
          editable={editable}
          onChange={handleContentChange}
        />
      </main>

      {shareOpen && <ShareDialog documentId={documentId} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
