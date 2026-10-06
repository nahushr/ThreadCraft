import type { ReactNode } from "react";

export type ThreadCraftId = string | number;
export type ThreadCraftVariant = "issue" | "review" | "chat";

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
  authorType?: string;
}

/** One JSON object describes the issue or product and the first page of comments. */
export interface ThreadCraftData {
  id?: ThreadCraftId;
  kind?: ThreadCraftVariant;
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

export type ThreadCraftReplyAuthorType = "customer" | "business" | "support" | "user";

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
  /** Selected chat provider; included in chat submissions when provider controls are enabled. */
  chatProvider?: string;
  /** Selected chat model; included in chat submissions when provider controls are enabled. */
  chatModel?: string;
}

export interface ThreadCraftChatModel {
  id: string;
  label?: string;
}

export interface ThreadCraftChatProviderOption {
  id: string;
  label: string;
  /** Optional host-provided key. Never included in ThreadCraftSubmitPayload. */
  apiKey?: string;
  /** Models supplied by the host, for example from its own model-list endpoint. */
  models?: ThreadCraftChatModel[];
}

export interface ThreadCraftLoadChatModelsRequest {
  provider: string;
  /** May be omitted when a host loads models through its own authenticated backend. */
  apiKey?: string;
}

export interface ThreadCraftDiscussionProps {
  data: ThreadCraftData;
  variant?: ThreadCraftVariant;
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
  /** Show the stream title and message/review count. Defaults to true. */
  showStreamHeading?: boolean;
  /** Place paged results at the top for older chat history, or at the bottom. */
  loadMorePlacement?: "start" | "end";
  loadMoreLabel?: string;
  loadingMoreLabel?: string;
  loadMoreErrorText?: string;
  emptyMessage?: string;
  inputPlaceholder?: string;
  composerLabel?: string;
  submitButtonLabel?: string;
  submittingLabel?: string;
  allowEmoji?: boolean;
  /** Show a package-styled assistant typing indicator in chat mode. */
  typingIndicator?: boolean;
  typingIndicatorLabel?: string;
  /** Disable the composer while the host application is processing a message. */
  isSubmitting?: boolean;
  /** Sync changed data.comments props into the rendered message list. */
  controlledComments?: boolean;
  /** Render provider and model selectors above the chat stream. Opt-in, chat variant only. */
  showChatProviderControls?: boolean;
  /** Provider choices and optional preloaded models/API keys for chat controls. */
  chatProviders?: ThreadCraftChatProviderOption[];
  /** Show a password input for the active provider key. Defaults to true when controls are enabled. */
  showChatApiKeyInput?: boolean;
  /** Controlled provider selection. */
  selectedChatProvider?: string;
  /** Controlled model selection. */
  selectedChatModel?: string;
  onChatProviderChange?: (provider: string) => void;
  onChatModelChange?: (model: string) => void;
  /** Called as the user types; keys remain in host/component memory and are not persisted by the package. */
  onChatApiKeyChange?: (provider: string, apiKey: string) => void;
  /** Load available models for the selected provider. */
  onLoadChatModels?: (
    request: ThreadCraftLoadChatModelsRequest,
  ) => Promise<ThreadCraftChatModel[]>;
  /** Render comment content with an app-specific safe Markdown renderer when needed. */
  renderCommentBody?: (comment: ThreadCraftComment) => ReactNode;
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
