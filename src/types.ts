export type ThreadCraftId = string | number;

export interface ThreadCraftAttachment {
  name: string;
  url?: string;
  dataUrl?: string;
  mimeType?: string;
  size?: number;
}

export type ThreadCraftAttachmentInput = string | ThreadCraftAttachment;

/** Appearance overrides for comments with a matching authorType. Color values accept any CSS color. */
export interface ThreadCraftAuthorTypeStyle {
  label?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  icon?: string;
  cardColor?: string;
  cardBorderColor?: string;
  cardTextColor?: string;
  avatarBackgroundColor?: string;
  avatarTextColor?: string;
  avatarBorderColor?: string;
}

/** A discussion node. Supply `replies` for nested JSON or parent/quote IDs for flat API data. */
export interface ThreadCraftComment {
  id: ThreadCraftId;
  author: string;
  text?: string;
  body?: string;
  authorAvatarUrl?: string;
  avatarBackgroundColor?: string;
  avatarTextColor?: string;
  avatarBorderColor?: string;
  cardColor?: string;
  cardBorderColor?: string;
  cardTextColor?: string;
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
  /** Per-role labels, chip colors, card colors, icons, and avatar color defaults. */
  authorTypeStyles?: Record<string, ThreadCraftAuthorTypeStyle>;
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

export interface ThreadCraftIdentityField {
  label: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  keyboardType?: "default" | "email-address";
}

export interface ThreadCraftIdentityFields {
  authorName?: ThreadCraftIdentityField;
  authorEmail?: ThreadCraftIdentityField;
}

export interface ThreadCraftSubmitPayload {
  text: string;
  parentId?: ThreadCraftId;
  attachments: ThreadCraftAttachment[];
  rating?: number;
  authorName?: string;
  authorEmail?: string;
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
  /** Whether the root-level composer is available. Defaults to true. */
  allowNewComments?: boolean;
  allowAttachments?: boolean;
  allowReactions?: boolean;
  /** Show stars on review comments; independent of whether the composer collects a rating. */
  showRating?: boolean;
  allowRatingInput?: boolean;
  /** Role options for replies. A single option is shown as a fixed identity. */
  replyAuthorTypes?: ThreadCraftReplyAuthorType[];
  newCommentAuthorType?: ThreadCraftReplyAuthorType;
  /** Where newly submitted root comments appear. Defaults to the end. */
  newCommentPosition?: "start" | "end";
  identityFields?: ThreadCraftIdentityFields;
  /** Native clients provide their platform file-picker through this callback. */
  onPickAttachments?: () => Promise<ThreadCraftAttachment[]>;
  onLoadMore?: (
    request: ThreadCraftLoadMoreRequest,
  ) => Promise<ThreadCraftLoadMoreResult>;
  onSubmitComment?: (
    payload: ThreadCraftSubmitPayload,
  ) => Promise<ThreadCraftComment | void>;
  onReact?: (comment: ThreadCraftComment, emoji: string) => void;
}
