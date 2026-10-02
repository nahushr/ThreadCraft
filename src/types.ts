export type ThreadCraftId = string | number;

export interface ThreadCraftAttachment {
  name: string;
  url?: string;
  dataUrl?: string;
  mimeType?: string;
  size?: number;
}

export type ThreadCraftAttachmentInput = string | ThreadCraftAttachment;

/** A discussion node. Supply `replies` for nested JSON or parent/quote IDs for flat API data. */
export interface ThreadCraftComment {
  id: ThreadCraftId;
  author: string;
  text?: string;
  body?: string;
  authorAvatarUrl?: string;
  createdAt?: string;
  parentId?: ThreadCraftId | null;
  quotedCommentId?: ThreadCraftId | null;
  quotedText?: string;
  quotedAuthor?: string;
  replies?: ThreadCraftComment[];
  reactions?: Record<string, number>;
  attachments?: ThreadCraftAttachmentInput[];
  rating?: number;
  ratings?: number;
  isCustomer?: boolean;
  isMine?: boolean;
  authorType?: "customer" | "business" | "support" | "bot" | string;
}

/** One JSON object describes the issue or product and the first page of comments. */
export interface ThreadCraftData {
  id?: ThreadCraftId;
  kind?: "issue" | "review";
  title: string;
  author?: string;
  authorAvatarUrl?: string;
  createdAt?: string;
  body?: string;
  status?: string;
  url?: string;
  comments: ThreadCraftComment[];
  /** Set true on review data to show and collect star ratings. */
  showRating?: boolean;
  /** Set when the first page is partial and an async load-more handler is supplied. */
  hasMore?: boolean;
  totalRootComments?: number;
}

export interface ThreadCraftLoadMoreRequest {
  offset: number;
  limit: number;
}

export interface ThreadCraftLoadMoreResult {
  comments: ThreadCraftComment[];
  hasMore?: boolean;
}

export type ThreadCraftReplyAuthorType = "customer" | "business" | "support";

export interface ThreadCraftSubmitPayload {
  text: string;
  parentId?: ThreadCraftId;
  attachments: ThreadCraftAttachment[];
  rating?: number;
  /** Selected reply identity; issue replies use support/customer, reviews use customer/business. */
  authorType?: ThreadCraftReplyAuthorType;
}

export interface ThreadCraftDiscussionProps {
  data: ThreadCraftData;
  variant?: "issue" | "review";
  currentUser?: string;
  /** Whether to render the issue/review metadata card. Defaults to true. */
  showHeader?: boolean;
  /** Root comments shown on first render. Defaults to 50. */
  initialRootLimit?: number;
  /** Number of additional roots requested or revealed per click. Defaults to 50. */
  loadMoreCount?: number;
  allowReplies?: boolean;
  allowAttachments?: boolean;
  allowReactions?: boolean;
  onLoadMore?: (
    request: ThreadCraftLoadMoreRequest,
  ) => Promise<ThreadCraftLoadMoreResult>;
  onSubmitComment?: (
    payload: ThreadCraftSubmitPayload,
  ) => Promise<ThreadCraftComment | void>;
  onReact?: (comment: ThreadCraftComment, emoji: string) => void;
}
