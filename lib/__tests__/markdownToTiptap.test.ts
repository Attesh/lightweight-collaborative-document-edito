import { describe, expect, it } from "vitest";
import { markdownToTiptapJSON, plainTextToTiptapJSON } from "@/lib/markdownToTiptap";

describe("markdownToTiptapJSON", () => {
  it("converts a heading to a heading node", () => {
    const doc = markdownToTiptapJSON("# Title");
    expect(doc.content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Title" }],
    });
  });

  it("caps heading levels at 3", () => {
    const doc = markdownToTiptapJSON("##### Deep heading");
    expect(doc.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 3 } });
  });

  it("converts bold and italic inline marks", () => {
    const doc = markdownToTiptapJSON("This is **bold** and *italic*.");
    const paragraph = doc.content?.[0];
    expect(paragraph?.type).toBe("paragraph");
    const boldNode = paragraph?.content?.find((n) => n.text === "bold");
    const italicNode = paragraph?.content?.find((n) => n.text === "italic");
    expect(boldNode?.marks).toEqual([{ type: "bold" }]);
    expect(italicNode?.marks).toEqual([{ type: "italic" }]);
  });

  it("converts a bullet list into listItem nodes", () => {
    const doc = markdownToTiptapJSON("- one\n- two\n");
    expect(doc.content?.[0].type).toBe("bulletList");
    expect(doc.content?.[0].content).toHaveLength(2);
    expect(doc.content?.[0].content?.[0].type).toBe("listItem");
  });

  it("converts an ordered list", () => {
    const doc = markdownToTiptapJSON("1. one\n2. two\n");
    expect(doc.content?.[0].type).toBe("orderedList");
  });

  it("falls back to a single empty paragraph for empty input", () => {
    const doc = markdownToTiptapJSON("");
    expect(doc).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
});

describe("plainTextToTiptapJSON", () => {
  it("splits on blank lines into separate paragraphs", () => {
    const doc = plainTextToTiptapJSON("First paragraph.\n\nSecond paragraph.");
    expect(doc.content).toHaveLength(2);
    expect(doc.content?.[0].content?.[0].text).toBe("First paragraph.");
    expect(doc.content?.[1].content?.[0].text).toBe("Second paragraph.");
  });

  it("collapses single newlines within a paragraph into spaces", () => {
    const doc = plainTextToTiptapJSON("line one\nline two");
    expect(doc.content?.[0].content?.[0].text).toBe("line one line two");
  });
});
