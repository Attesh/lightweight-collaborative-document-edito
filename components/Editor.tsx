"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect, useState } from "react";
import { Toolbar } from "@/components/Toolbar";

export function Editor({
  content,
  editable,
  onChange,
}: {
  content: unknown;
  editable: boolean;
  onChange: (json: unknown) => void;
}) {
  const [, forceRerender] = useState(0);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: content as never,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    onSelectionUpdate: () => forceRerender((n) => n + 1),
    onTransaction: () => forceRerender((n) => n + 1),
    editorProps: {
      attributes: {
        class: "doc-content focus:outline-none min-h-[60vh] px-10 py-8",
      },
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
