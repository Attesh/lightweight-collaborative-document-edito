import { marked } from "marked";
import type { Token, Tokens } from "marked";

type JSONNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JSONNode[];
  text?: string;
  marks?: { type: string }[];
};

function inlineTokensToJSON(tokens: Token[] | undefined, marks: { type: string }[] = []): JSONNode[] {
  if (!tokens || tokens.length === 0) return [];
  const nodes: JSONNode[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "strong": {
        nodes.push(...inlineTokensToJSON((token as Tokens.Strong).tokens, [...marks, { type: "bold" }]));
        break;
      }
      case "em": {
        nodes.push(...inlineTokensToJSON((token as Tokens.Em).tokens, [...marks, { type: "italic" }]));
        break;
      }
      case "codespan": {
        nodes.push({ type: "text", text: (token as Tokens.Codespan).text, marks: [...marks, { type: "code" }] });
        break;
      }
      case "link": {
        const linkMark = { type: "link", attrs: { href: (token as Tokens.Link).href } } as unknown as { type: string };
        nodes.push(...inlineTokensToJSON((token as Tokens.Link).tokens, [...marks, linkMark]));
        break;
      }
      case "text": {
        const t = token as Tokens.Text;
        if (t.tokens && t.tokens.length > 0) {
          nodes.push(...inlineTokensToJSON(t.tokens, marks));
        } else {
          const text = t.text ?? "";
          if (text.length > 0) {
            nodes.push({ type: "text", text, ...(marks.length ? { marks } : {}) });
          }
        }
        break;
      }
      case "br": {
        nodes.push({ type: "hardBreak" });
        break;
      }
      default: {
        const raw = "raw" in token ? (token as { raw: string }).raw : "";
        if (raw) nodes.push({ type: "text", text: raw, ...(marks.length ? { marks } : {}) });
      }
    }
  }
  return nodes;
}

function listItemToJSON(item: Tokens.ListItem): JSONNode {
  const content: JSONNode[] = [];
  for (const child of item.tokens) {
    if (child.type === "text") {
      const textTok = child as Tokens.Text;
      content.push({
        type: "paragraph",
        content: inlineTokensToJSON(textTok.tokens ?? [{ type: "text", raw: textTok.text, text: textTok.text } as Token]),
      });
    } else {
      const converted = blockTokenToJSON(child);
      if (converted) content.push(converted);
    }
  }
  if (content.length === 0) content.push({ type: "paragraph" });
  return { type: "listItem", content };
}

function blockTokenToJSON(token: Token): JSONNode | null {
  switch (token.type) {
    case "heading": {
      const h = token as Tokens.Heading;
      return {
        type: "heading",
        attrs: { level: Math.min(h.depth, 3) },
        content: inlineTokensToJSON(h.tokens),
      };
    }
    case "paragraph": {
      const p = token as Tokens.Paragraph;
      const content = inlineTokensToJSON(p.tokens);
      return content.length ? { type: "paragraph", content } : { type: "paragraph" };
    }
    case "list": {
      const l = token as Tokens.List;
      return {
        type: l.ordered ? "orderedList" : "bulletList",
        content: l.items.map(listItemToJSON),
      };
    }
    case "blockquote": {
      const bq = token as Tokens.Blockquote;
      const inner = bq.tokens.map(blockTokenToJSON).filter((n): n is JSONNode => n !== null);
      return { type: "blockquote", content: inner.length ? inner : [{ type: "paragraph" }] };
    }
    case "code": {
      const c = token as Tokens.Code;
      return {
        type: "codeBlock",
        content: c.text ? [{ type: "text", text: c.text }] : [],
      };
    }
    case "hr":
      return { type: "horizontalRule" };
    case "space":
      return null;
    default:
      return null;
  }
}

export function markdownToTiptapJSON(markdown: string): JSONNode {
  const tokens = marked.lexer(markdown);
  const content = tokens.map(blockTokenToJSON).filter((n): n is JSONNode => n !== null);
  return {
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  };
}

export function plainTextToTiptapJSON(text: string): JSONNode {
  const paragraphs = text.split(/\r?\n\r?\n/).map((block) => block.trim());
  const content: JSONNode[] = paragraphs
    .filter((p) => p.length > 0)
    .map((p) => ({
      type: "paragraph",
      content: [{ type: "text", text: p.replace(/\r?\n/g, " ") }],
    }));
  return {
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  };
}
