import type { ThreadCraftComment } from "../types";

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉"];

const REACTION_ALIASES: Record<string, string> = {
  "+1": "👍",
  "-1": "👎",
  laugh: "😂",
  hooray: "🎉",
  confused: "🤔",
  heart: "❤️",
  rocket: "🚀",
  eyes: "👀",
};

export const normalizeReactions = (
  reactions: Record<string, number> = {},
): Record<string, number> =>
  Object.entries(reactions).reduce<Record<string, number>>(
    (normalized, [reaction, count]) => {
      const emoji = REACTION_ALIASES[reaction] || reaction;
      normalized[emoji] = (normalized[emoji] || 0) + count;
      return normalized;
    },
    {},
  );

export const isCustomerComment = (comment: ThreadCraftComment): boolean => {
  const authorType = comment.authorType?.toLowerCase();
  return Boolean(comment.isCustomer || comment.isMine) ||
    authorType === "customer" || authorType === "user" || authorType === "bot";
};
