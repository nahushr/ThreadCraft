import type {
  ThreadCraftAttachmentInput,
  ThreadCraftComment,
  ThreadCraftId,
} from "./types";

const uniqueAttachments = (
  attachments: ThreadCraftAttachmentInput[],
): ThreadCraftAttachmentInput[] => {
  const seen = new Set<string>();
  return attachments.filter((attachment) => {
    const key = typeof attachment === "string"
      ? attachment
      : attachment.url || attachment.dataUrl || `${attachment.name}:${attachment.size ?? 0}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const parseCommentBody = (
  comment: ThreadCraftComment,
): {
  text: string;
  quotedText?: string;
  quotedAuthor?: string;
  isCustomer: boolean;
  attachments: ThreadCraftAttachmentInput[];
} => {
  const raw = comment.text ?? comment.body ?? "";
  const bodyLines: string[] = [];
  const quoteLines: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith(">")) quoteLines.push(trimmed.replace(/^>+\s*/, ""));
    else bodyLines.push(line);
  }

  const images: ThreadCraftAttachmentInput[] = [];
  const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = imageRegex.exec(raw))) {
    images.push({ name: match[1] || "Image attachment", url: match[2], mimeType: "image/*" });
  }
  const htmlImageRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  while ((match = htmlImageRegex.exec(raw))) {
    images.push({ name: "Image attachment", url: match[1], mimeType: "image/*" });
  }

  const quoteBody = quoteLines.join("\n");
  const quotedAuthorMatch = /\*\*\[?@?([^*:\]\n]+)\]?\*\*:/u.exec(quoteBody);
  const isCustomer =
    bodyLines.join("\n").includes("### 👤 **Customer") ||
    bodyLines.join("\n").includes("Customer Message") ||
    (comment.authorType?.toLowerCase() === "bot" && Boolean(comment.author?.includes("customer-support")));

  const text = bodyLines
    .join("\n")
    .replace(/###\s*👤\s*\*\*Customer.*?\*\*/gi, "")
    .replace(/###?\s*(?:📎\s*)?\*\*Attachments\*\*[\s\S]*$/gi, "")
    .replace(/###?\s*(?:📎\s*)?Attachments[\s\S]*$/gi, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<img\b[^>]*>/gi, "")
    .trim();
  const quotedText = comment.quotedText || quoteLines.join(" ").trim() || undefined;

  return {
    text,
    quotedText,
    quotedAuthor: comment.quotedAuthor || quotedAuthorMatch?.[1].trim(),
    isCustomer,
    attachments: uniqueAttachments([...(comment.attachments || []), ...images]),
  };
};

/** Normalizes explicit nested JSON and flat GitHub-style quoted-comment payloads. */
export const buildCommentTree = (
  comments: ThreadCraftComment[],
): ThreadCraftComment[] => {
  const flattened: ThreadCraftComment[] = [];
  const collect = (items: ThreadCraftComment[], inheritedParent?: ThreadCraftId) => {
    for (const original of items) {
      const parsed = parseCommentBody(original);
      const parentId = original.parentId ?? original.quotedCommentId ?? inheritedParent ?? null;
      flattened.push({
        ...original,
        text: parsed.text || original.text || original.body || "",
        quotedText: parsed.quotedText,
        quotedAuthor: parsed.quotedAuthor,
        isCustomer: Boolean(original.isCustomer || original.isMine || parsed.isCustomer),
        rating: original.rating ?? original.ratings,
        authorType: original.authorType || (parsed.isCustomer ? "customer" : undefined),
        parentId,
        replies: [],
        attachments: parsed.attachments,
      });
      if (original.replies?.length) collect(original.replies, original.id);
    }
  };
  collect(comments || []);

  // GitHub comment bodies sometimes carry the parent as a markdown quote only.
  flattened.forEach((comment, index) => {
    if (comment.parentId != null || !comment.quotedText) return;
    const quote = comment.quotedText.trim().toLowerCase();
    if (!quote) return;
    for (let parentIndex = index - 1; parentIndex >= 0; parentIndex -= 1) {
      const candidate = flattened[parentIndex];
      const parentText = (candidate.text || "").trim().toLowerCase();
      if (parentText && (parentText === quote || parentText.includes(quote) || quote.includes(parentText))) {
        comment.parentId = candidate.id;
        comment.quotedAuthor ||= candidate.author;
        break;
      }
    }
  });

  const nodeById = new Map(flattened.map((comment) => [String(comment.id), comment]));
  const roots: ThreadCraftComment[] = [];
  const childrenByParent = new Map<string, ThreadCraftComment[]>();
  for (const comment of flattened) {
    if (comment.parentId == null || !nodeById.has(String(comment.parentId)) || String(comment.parentId) === String(comment.id)) {
      roots.push(comment);
      continue;
    }
    const key = String(comment.parentId);
    const children = childrenByParent.get(key) || [];
    children.push(comment);
    childrenByParent.set(key, children);
  }

  const attach = (parent: ThreadCraftComment, seen = new Set<string>()): ThreadCraftComment => {
    const key = String(parent.id);
    if (seen.has(key)) return parent;
    const nextSeen = new Set(seen).add(key);
    return {
      ...parent,
      replies: (childrenByParent.get(key) || []).map((child) => attach(child, nextSeen)),
    };
  };

  return roots.map((root) => attach(root));
};

export const appendReplyToTree = (
  comments: ThreadCraftComment[],
  parentId: ThreadCraftId,
  reply: ThreadCraftComment,
): ThreadCraftComment[] => {
  let added = false;
  const visit = (items: ThreadCraftComment[]): ThreadCraftComment[] => items.map((item) => {
    if (String(item.id) === String(parentId)) {
      added = true;
      return { ...item, replies: [...(item.replies || []), reply] };
    }
    if (!item.replies?.length) return item;
    return { ...item, replies: visit(item.replies) };
  });
  const next = visit(comments);
  return added ? next : comments;
};

export const appendUniqueRootComments = (
  current: ThreadCraftComment[],
  next: ThreadCraftComment[],
): ThreadCraftComment[] => {
  const ids = new Set(current.map((comment) => String(comment.id)));
  const uniqueNext = next.filter((comment) => {
    const key = String(comment.id);
    if (ids.has(key)) return false;
    ids.add(key);
    return true;
  });
  return [...current, ...uniqueNext];
};

/** Prepends older history while dropping duplicate root messages by ID. */
export const prependUniqueRootComments = (
  current: ThreadCraftComment[],
  older: ThreadCraftComment[],
): ThreadCraftComment[] => {
  const ids = new Set(current.map((comment) => String(comment.id)));
  const uniqueOlder = older.filter((comment) => {
    const key = String(comment.id);
    if (ids.has(key)) return false;
    ids.add(key);
    return true;
  });
  return [...uniqueOlder, ...current];
};

export const countRootComments = (comments: ThreadCraftComment[]): number => comments.length;
