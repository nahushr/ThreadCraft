import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import type {
  ThreadCraftComment,
  ThreadCraftDiscussionProps,
  ThreadCraftId,
  ThreadCraftReplyAuthorType,
  ThreadCraftSubmitPayload,
  ThreadCraftVariant,
} from "./types";
import {
  appendReplyToTree,
  appendUniqueRootComments,
  buildCommentTree,
  prependUniqueRootComments,
} from "./threadUtils";
import { normalizeReactions } from "./utils/reactions";
import CommentComposer from "./components/CommentComposer";
import CommentThread from "./components/CommentThread";
import DiscussionHeader from "./components/DiscussionHeader";
import ChatTypingIndicator from "./components/ChatTypingIndicator";
import ChatProviderControls from "./components/ChatProviderControls";
import styles from "./ThreadedDiscussion.module.scss";

let fallbackCommentIdSequence = 0;

const createCommentId = (): string => {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto.getRandomValues === "function") {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      return `comment-${suffix}`;
    }
  }
  fallbackCommentIdSequence += 1;
  return `comment-${Date.now()}-${fallbackCommentIdSequence}`;
};

const countComments = (comments: ThreadCraftComment[]): number =>
  comments.reduce((total, comment) => total + 1 + countComments(comment.replies || []), 0);

const getParentId = (comment: ThreadCraftComment | null): ThreadCraftId | undefined =>
  comment?.id;

const getDiscussionVariant = (
  requestedVariant: ThreadCraftDiscussionProps["variant"],
  data: ThreadCraftDiscussionProps["data"],
): NonNullable<ThreadCraftDiscussionProps["variant"]> => requestedVariant || data.kind || "issue";

const getNewCommentAuthorType = (
  override: ThreadCraftDiscussionProps["newCommentAuthorType"],
  variant: NonNullable<ThreadCraftDiscussionProps["variant"]>,
): NonNullable<ThreadCraftDiscussionProps["newCommentAuthorType"]> => {
  if (override) return override;
  if (variant === "review") return "customer";
  if (variant === "chat") return "user";
  return "support";
};

const getReplyAuthorTypes = (
  options: ThreadCraftDiscussionProps["replyAuthorTypes"],
  variant: NonNullable<ThreadCraftDiscussionProps["variant"]>,
): NonNullable<ThreadCraftDiscussionProps["replyAuthorTypes"]> => {
  if (options?.length) return options;
  if (variant === "review") return ["customer", "business"];
  if (variant === "chat") return [];
  return ["support", "customer"];
};

const getSectionTitle = (variant: NonNullable<ThreadCraftDiscussionProps["variant"]>): string => {
  if (variant === "review") return "Customer reviews";
  if (variant === "chat") return "Messages";
  return "Discussion";
};

const getSectionLabel = (variant: NonNullable<ThreadCraftDiscussionProps["variant"]>): string => {
  if (variant === "review") return "Product reviews";
  if (variant === "chat") return "Chat conversation";
  return "Issue discussion";
};

const getCommentNoun = (variant: NonNullable<ThreadCraftDiscussionProps["variant"]>): string => {
  if (variant === "review") return "reviews";
  if (variant === "chat") return "messages";
  return "comments";
};

const getEmptyStateText = (
  override: string | undefined,
  variant: NonNullable<ThreadCraftDiscussionProps["variant"]>,
): string => {
  if (override) return override;
  if (variant === "chat") return "Start a conversation with the assistant.";
  return "No replies yet. Start the conversation.";
};

const getMoreButtonText = (
  loading: boolean,
  loadingLabel: string | undefined,
  label: string | undefined,
  variant: NonNullable<ThreadCraftDiscussionProps["variant"]>,
): string => {
  if (loading) {
    if (loadingLabel) return loadingLabel;
    if (variant === "chat") return "Loading older messages…";
    return "Loading comments…";
  }
  if (label) return label;
  if (variant === "chat") return "Load older messages";
  return "See more comments";
};

const getLoadErrorText = (
  override: string | undefined,
  variant: NonNullable<ThreadCraftDiscussionProps["variant"]>,
): string => {
  if (override) return override;
  if (variant === "chat") return "Could not load older messages. Please try again.";
  return "Could not load more comments. Please try again.";
};

interface DiscussionConversationProps {
  data: ThreadCraftDiscussionProps["data"];
  variant: ThreadCraftVariant;
  isChat: boolean;
  showStreamHeading: boolean;
  sectionTitle: string;
  commentCount: number;
  olderMessagesPlacement: "start" | "end";
  streamRef: { current: HTMLDivElement | null };
  canLoadMore: boolean;
  loadingMore: boolean;
  moreButtonLabel: string;
  onShowMore: () => void;
  visibleComments: ThreadCraftComment[];
  emptyMessage: string | undefined;
  loadError: string;
  typingIndicator: boolean;
  typingIndicatorLabel: string | undefined;
  showRating: boolean;
  allowReplies: boolean;
  allowReactions: boolean;
  renderCommentBody: ThreadCraftDiscussionProps["renderCommentBody"];
  reactionCounts: Record<string, Record<string, number>>;
  selectedReactions: Record<string, string[]>;
  onReply: (comment: ThreadCraftComment) => void;
  onReact: (comment: ThreadCraftComment, emoji: string) => void;
  allowNewComments: boolean;
  allowAttachments: boolean;
  allowEmoji: boolean;
  allowRatingInput: boolean;
  replyAuthorTypes: ThreadCraftReplyAuthorType[];
  newCommentAuthorType: ThreadCraftReplyAuthorType;
  identityFields: ThreadCraftDiscussionProps["identityFields"];
  inputPlaceholder: string | undefined;
  composerLabel: string | undefined;
  submitButtonLabel: string | undefined;
  submittingLabel: string | undefined;
  isSubmitting: boolean;
  replyingTo: ThreadCraftComment | null;
  onCancelReply: () => void;
  onSubmit: (payload: ThreadCraftSubmitPayload) => Promise<void>;
}

interface ChatModelSettingsProps {
  id: string;
  titleId: string;
  panelRef: { current: HTMLDialogElement | null };
  triggerRef: { current: HTMLButtonElement | null };
  open: boolean;
  providerLabel: string;
  modelLabel: string;
  controls: JSX.Element | null;
  onOpen: () => void;
  onClose: () => void;
}

const getChangeModelLabel = (providerLabel: string, modelLabel: string): string => {
  let label = `Change AI model. ${providerLabel}`;
  if (modelLabel) label += `, ${modelLabel}`;
  return label;
};

const ChatModelSettings = ({
  id,
  titleId,
  panelRef,
  triggerRef,
  open,
  providerLabel,
  modelLabel,
  controls,
  onOpen,
  onClose,
}: ChatModelSettingsProps): JSX.Element => (
  <>
    {open && (
      <button
        aria-label="Close AI model settings"
        className={styles.chatSettingsScrim}
        type="button"
        onClick={onClose}
      />
    )}
    <dialog
      aria-labelledby={titleId}
      aria-modal={open ? "true" : undefined}
      className={[styles.chatSettingsPanel, open ? styles.chatSettingsPanelOpen : ""].filter(Boolean).join(" ")}
      id={id}
      open
      ref={panelRef}
      tabIndex={-1}
    >
      <div className={styles.chatSettingsHeading}>
        <div>
          <span className={styles.chatSettingsEyebrow}>MODEL CONFIGURATION</span>
          <h2 id={titleId}>AI model</h2>
          <p>Choose the provider and model for this conversation.</p>
        </div>
        <button aria-label="Close AI model settings" className={styles.chatSettingsClose} type="button" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {controls}
    </dialog>
    <button
      aria-controls={id}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={getChangeModelLabel(providerLabel, modelLabel)}
      className={styles.chatSettingsTrigger}
      ref={triggerRef}
      type="button"
      onClick={onOpen}
    >
      <span className={styles.chatSettingsTriggerCopy}>
        <span className={styles.chatSettingsTriggerLabel}>AI model</span>
        <strong>{providerLabel}</strong>
        {modelLabel && <span className={styles.chatSettingsTriggerModel}>{modelLabel}</span>}
      </span>
      <span className={styles.chatSettingsTriggerAction}>Change</span>
    </button>
  </>
);

const DiscussionConversation = ({
  data,
  variant,
  isChat,
  showStreamHeading,
  sectionTitle,
  commentCount,
  olderMessagesPlacement,
  streamRef,
  canLoadMore,
  loadingMore,
  moreButtonLabel,
  onShowMore,
  visibleComments,
  emptyMessage,
  loadError,
  typingIndicator,
  typingIndicatorLabel,
  showRating,
  allowReplies,
  allowReactions,
  renderCommentBody,
  reactionCounts,
  selectedReactions,
  onReply,
  onReact,
  allowNewComments,
  allowAttachments,
  allowEmoji,
  allowRatingInput,
  replyAuthorTypes,
  newCommentAuthorType,
  identityFields,
  inputPlaceholder,
  composerLabel,
  submitButtonLabel,
  submittingLabel,
  isSubmitting,
  replyingTo,
  onCancelReply,
  onSubmit,
}: DiscussionConversationProps): JSX.Element => {
  const moreButton = canLoadMore ? (
    <button
      className={`${styles.moreButton} ${olderMessagesPlacement === "start" ? styles.chatMoreButtonStart : ""}`}
      disabled={loadingMore}
      type="button"
      onClick={onShowMore}
    >
      {moreButtonLabel}
    </button>
  ) : null;

  return (
    <>
      {showStreamHeading && (
        <div className={styles.streamHeading}>
          <strong>{sectionTitle}</strong>
          <span>{data.totalRootComments ?? commentCount} {getCommentNoun(variant)}</span>
        </div>
      )}
      <section
        aria-label={isChat ? "Conversation messages" : "Discussion comments"}
        className={[styles.stream, isChat ? styles.chatStream : ""].filter(Boolean).join(" ")}
        ref={streamRef}
      >
        {olderMessagesPlacement === "start" && moreButton}
        {visibleComments.length === 0 ? (
          <p className={styles.empty}>{getEmptyStateText(emptyMessage, variant)}</p>
        ) : visibleComments.map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            authorTypeStyles={data.authorTypeStyles}
            depth={0}
            showRating={showRating}
            allowReplies={allowReplies}
            allowReactions={allowReactions}
            variant={variant}
            renderCommentBody={renderCommentBody}
            onReply={onReply}
            reactionCounts={reactionCounts}
            selectedReactions={selectedReactions}
            onReact={onReact}
          />
        ))}
        {olderMessagesPlacement === "end" && moreButton}
        {isChat && typingIndicator && <ChatTypingIndicator label={typingIndicatorLabel} />}
        {loadError && <p className={styles.error} role="alert">{loadError}</p>}
      </section>
      {(allowNewComments || (allowReplies && replyingTo != null)) && (
        <CommentComposer
          variant={variant}
          showRating={showRating}
          allowRatingInput={allowRatingInput}
          allowAttachments={allowAttachments}
          allowEmoji={allowEmoji}
          replyAuthorTypes={replyAuthorTypes}
          newCommentAuthorType={newCommentAuthorType}
          identityFields={identityFields}
          inputPlaceholder={inputPlaceholder}
          composerLabel={composerLabel}
          submitButtonLabel={submitButtonLabel}
          submittingLabel={submittingLabel}
          isSubmitting={isSubmitting}
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
          onSubmit={onSubmit}
        />
      )}
    </>
  );
};

const isOlderHistory = (
  current: ThreadCraftComment[],
  next: ThreadCraftComment[],
): boolean => Boolean(
  current.length > 0 &&
  next.length > current.length &&
  String(next[0]?.id) !== String(current[0]?.id) &&
  next.some((comment) => String(comment.id) === String(current[0]?.id)) &&
  String(next.at(-1)?.id) === String(current.at(-1)?.id),
);

const Discussion = ({
  data,
  variant: requestedVariant,
  currentUser = "You",
  showHeader = true,
  initialRootLimit = 50,
  loadMoreCount,
  allowReplies = true,
  allowNewComments = true,
  allowAttachments = true,
  allowReactions: allowReactionsProp,
  showRating: showRatingProp,
  allowRatingInput: allowRatingInputProp,
  replyAuthorTypes,
  newCommentAuthorType,
  newCommentPosition = "end",
  identityFields,
  showStreamHeading = true,
  loadMorePlacement,
  loadMoreLabel,
  loadingMoreLabel,
  loadMoreErrorText,
  emptyMessage,
  inputPlaceholder,
  composerLabel,
  submitButtonLabel,
  submittingLabel,
  allowEmoji: allowEmojiProp,
  typingIndicator = false,
  typingIndicatorLabel,
  isSubmitting = false,
  controlledComments = false,
  showChatProviderControls = false,
  chatProviders = [],
  showChatApiKeyInput = true,
  selectedChatProvider,
  selectedChatModel,
  onChatProviderChange,
  onChatModelChange,
  onChatApiKeyChange,
  onLoadChatModels,
  renderCommentBody,
  onLoadMore,
  onSubmitComment,
  onReact,
}: ThreadCraftDiscussionProps): JSX.Element => {
  const variant = getDiscussionVariant(requestedVariant, data);
  const isChat = variant === "chat";
  const allowReactions = allowReactionsProp ?? !isChat;
  const allowEmoji = allowEmojiProp ?? !isChat;
  const olderMessagesPlacement = loadMorePlacement ?? (isChat ? "start" : "end");
  const pageSize = Math.max(1, loadMoreCount || initialRootLimit || 50);
  const initialLimit = Math.max(1, initialRootLimit || 50);
  const normalizedComments = useMemo(
    () => buildCommentTree(data.comments || []),
    [data.comments],
  );
  const dataKey = `${variant}:${String(data.id ?? data.title)}`;
  const [comments, setComments] = useState(normalizedComments);
  const [visibleRootCount, setVisibleRootCount] = useState(
    isChat ? Math.max(initialLimit, normalizedComments.length) : initialLimit,
  );
  const [hasMore, setHasMore] = useState(
    data.hasMore ?? normalizedComments.length > initialLimit,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ThreadCraftComment | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});
  const [selectedReactions, setSelectedReactions] = useState<Record<string, string[]>>({});
  const [localChatProvider, setLocalChatProvider] = useState(selectedChatProvider ?? chatProviders[0]?.id ?? "");
  const [localChatModel, setLocalChatModel] = useState(selectedChatModel ?? "");
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const chatSettingsId = useId();
  const chatSettingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const chatSettingsPanelRef = useRef<HTMLDialogElement | null>(null);
  const lastDataKey = useRef(dataKey);
  const lastSyncedData = useRef({ dataKey, comments: data.comments, hasMore: data.hasMore });
  const streamRef = useRef<HTMLDivElement | null>(null);
  const scrollIntent = useRef<{ kind: "bottom" } | { kind: "preserve"; top: number; height: number }>({ kind: "bottom" });
  const showRating = showRatingProp ?? (variant === "review" && data.showRating === true);
  const allowRatingInput = allowRatingInputProp ?? showRating;
  const resolvedNewCommentAuthorType = getNewCommentAuthorType(newCommentAuthorType, variant);
  const resolvedReplyAuthorTypes = getReplyAuthorTypes(replyAuthorTypes, variant);
  const resolvedChatProvider = chatProviders.some(({ id }) => id === (selectedChatProvider ?? localChatProvider))
    ? selectedChatProvider ?? localChatProvider
    : chatProviders[0]?.id ?? "";
  const resolvedChatModel = selectedChatModel ?? localChatModel;
  const hasChatProviderControls = isChat && showChatProviderControls && chatProviders.length > 0;

  useEffect(() => {
    if (controlledComments) {
      const previous = lastSyncedData.current;
      const keyChanged = previous.dataKey !== dataKey;
      if (!keyChanged && previous.comments === data.comments && previous.hasMore === data.hasMore) return;
      if (isChat && !keyChanged && isOlderHistory(previous.comments || [], data.comments || [])) {
        const stream = streamRef.current;
        scrollIntent.current = { kind: "preserve", top: stream?.scrollTop || 0, height: stream?.scrollHeight || 0 };
      } else if (isChat) {
        scrollIntent.current = { kind: "bottom" };
      }
      lastSyncedData.current = { dataKey, comments: data.comments, hasMore: data.hasMore };
      setComments(normalizedComments);
      setVisibleRootCount(isChat ? Math.max(initialLimit, normalizedComments.length) : initialLimit);
      setHasMore(data.hasMore ?? normalizedComments.length > initialLimit);
      if (keyChanged) {
        setReplyingTo(null);
        setLoadError("");
        setReactionCounts({});
        setSelectedReactions({});
      }
      lastDataKey.current = dataKey;
      return;
    }
    if (lastDataKey.current === dataKey) return;
    lastDataKey.current = dataKey;
    setComments(normalizedComments);
    setVisibleRootCount(initialLimit);
    setHasMore(data.hasMore ?? normalizedComments.length > initialLimit);
    setReplyingTo(null);
    setLoadError("");
    setReactionCounts({});
    setSelectedReactions({});
  }, [controlledComments, data.comments, data.hasMore, dataKey, initialLimit, isChat, normalizedComments]);

  useLayoutEffect(() => {
    if (!isChat) return;
    const stream = streamRef.current;
    if (!stream) return;
    if (scrollIntent.current.kind === "preserve") {
      const previous = scrollIntent.current;
      stream.scrollTop = previous.top + Math.max(0, stream.scrollHeight - previous.height);
    } else {
      stream.scrollTop = stream.scrollHeight;
    }
    scrollIntent.current = { kind: "bottom" };
  }, [comments, isChat, typingIndicator]);

  useEffect(() => {
    if (!hasChatProviderControls || !chatSettingsOpen) return;

    const panel = chatSettingsPanelRef.current;
    if (!panel) return;
    const initialFocus = panel.querySelector<HTMLElement>("select, input, button");
    initialFocus?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setChatSettingsOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      chatSettingsTriggerRef.current?.focus();
    };
  }, [chatSettingsOpen, hasChatProviderControls]);

  const visibleComments = comments.slice(0, visibleRootCount);
  const canLoadMore = comments.length > visibleRootCount || (hasMore && Boolean(onLoadMore));
  const commentCount = countComments(comments);
  const sectionTitle = getSectionTitle(variant);

  const handleReply = (comment: ThreadCraftComment): void => {
    setReplyingTo(comment);
  };

  const handleReact = (comment: ThreadCraftComment, emoji: string): void => {
    const commentKey = String(comment.id);
    const wasSelected = selectedReactions[commentKey]?.includes(emoji) || false;
    const initialCount = normalizeReactions(comment.reactions)[emoji] || 0;

    setSelectedReactions((current) => {
      const selected = new Set(current[commentKey] || []);
      if (selected.has(emoji)) selected.delete(emoji);
      else selected.add(emoji);
      return { ...current, [commentKey]: [...selected] };
    });
    setReactionCounts((current) => {
      const currentCount = current[commentKey]?.[emoji] ?? initialCount;
      return {
      ...current,
      [commentKey]: {
          ...current[commentKey],
          [emoji]: Math.max(0, currentCount + (wasSelected ? -1 : 1)),
        },
      };
    });
    onReact?.(comment, emoji);
  };

  const handleShowMore = async (): Promise<void> => {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadError("");
    try {
      if (comments.length > visibleRootCount) {
        const nextVisibleCount = Math.min(comments.length, visibleRootCount + pageSize);
        setVisibleRootCount(nextVisibleCount);
        if (nextVisibleCount >= comments.length && !onLoadMore) setHasMore(false);
        return;
      }

      if (!onLoadMore) return;
      const result = await onLoadMore({ offset: comments.length, limit: pageSize });
      const nextComments = result.comments || [];
      setHasMore(result.hasMore ?? nextComments.length >= pageSize);
      if (controlledComments) return;
      if (isChat && olderMessagesPlacement === "start") {
        const stream = streamRef.current;
        scrollIntent.current = { kind: "preserve", top: stream?.scrollTop || 0, height: stream?.scrollHeight || 0 };
        setComments((current) => prependUniqueRootComments(current, nextComments));
      } else {
        scrollIntent.current = { kind: "bottom" };
        setComments((current) => appendUniqueRootComments(current, nextComments));
      }
      setVisibleRootCount((current) => current + nextComments.length);
    } catch {
      setLoadError(getLoadErrorText(loadMoreErrorText, variant));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (payload: ThreadCraftSubmitPayload): Promise<void> => {
    const submitPayload = hasChatProviderControls
      ? { ...payload, chatProvider: resolvedChatProvider, chatModel: resolvedChatModel || undefined }
      : payload;
    const saved = await onSubmitComment?.(submitPayload);
    if (isChat && controlledComments) {
      setReplyingTo(null);
      return;
    }
    const comment: ThreadCraftComment = saved
      ? { ...saved, authorType: saved.authorType ?? payload.authorType }
      : {
        id: createCommentId(),
        author: payload.authorName || currentUser,
        text: payload.text,
        createdAt: new Date().toISOString(),
        authorType: payload.authorType ?? resolvedNewCommentAuthorType,
        attachments: payload.attachments,
        reactions: {},
        rating: payload.rating,
      };
    const parentId = getParentId(replyingTo);

    if (parentId != null) {
      setComments((current) => appendReplyToTree(current, parentId, comment));
    } else {
      scrollIntent.current = { kind: "bottom" };
      setComments((current) => newCommentPosition === "start"
        ? [comment, ...current]
        : [...current, comment]);
      setVisibleRootCount((current) => Math.max(current, comments.length + 1));
    }
    setReplyingTo(null);
  };

  const moreButtonLabel = getMoreButtonText(loadingMore, loadingMoreLabel, loadMoreLabel, variant);

  const selectedProviderOption = chatProviders.find(({ id }) => id === resolvedChatProvider);
  const selectedModelLabel = selectedProviderOption?.models?.find(
    ({ id }) => id === resolvedChatModel,
  )?.label ?? resolvedChatModel;
  const conversationContent = (
    <DiscussionConversation
      data={data}
      variant={variant}
      isChat={isChat}
      showStreamHeading={showStreamHeading}
      sectionTitle={sectionTitle}
      commentCount={commentCount}
      olderMessagesPlacement={olderMessagesPlacement}
      streamRef={streamRef}
      canLoadMore={canLoadMore}
      loadingMore={loadingMore}
      moreButtonLabel={moreButtonLabel}
      onShowMore={() => void handleShowMore()}
      visibleComments={visibleComments}
      emptyMessage={emptyMessage}
      loadError={loadError}
      typingIndicator={typingIndicator}
      typingIndicatorLabel={typingIndicatorLabel}
      showRating={showRating}
      allowReplies={allowReplies}
      allowReactions={allowReactions}
      renderCommentBody={renderCommentBody}
      reactionCounts={reactionCounts}
      selectedReactions={selectedReactions}
      onReply={handleReply}
      onReact={handleReact}
      allowNewComments={allowNewComments}
      allowAttachments={allowAttachments}
      allowEmoji={allowEmoji}
      allowRatingInput={allowRatingInput}
      replyAuthorTypes={[...resolvedReplyAuthorTypes]}
      newCommentAuthorType={resolvedNewCommentAuthorType}
      identityFields={identityFields}
      inputPlaceholder={inputPlaceholder}
      composerLabel={composerLabel}
      submitButtonLabel={submitButtonLabel}
      submittingLabel={submittingLabel}
      isSubmitting={isSubmitting}
      replyingTo={replyingTo}
      onCancelReply={() => setReplyingTo(null)}
      onSubmit={handleSubmit}
    />
  );

  const chatProviderControls = hasChatProviderControls ? (
    <ChatProviderControls
      providers={chatProviders}
      showApiKeyInput={showChatApiKeyInput}
      selectedProvider={resolvedChatProvider}
      selectedModel={resolvedChatModel}
      onProviderChange={(provider) => {
        setLocalChatProvider(provider);
        onChatProviderChange?.(provider);
      }}
      onModelChange={(model) => {
        setLocalChatModel(model);
        onChatModelChange?.(model);
      }}
      onApiKeyChange={onChatApiKeyChange}
      onLoadModels={onLoadChatModels}
    />
  ) : null;

  return (
    <section
      aria-label={getSectionLabel(variant)}
      className={[styles.root, isChat ? styles.chatRoot : ""].filter(Boolean).join(" ")}
    >
      {showHeader && <DiscussionHeader data={data} variant={variant} />}

      {isChat ? (
        <div className={`${styles.chatWorkspace} ${hasChatProviderControls ? styles.chatWorkspaceWithSettings : ""}`}>
          {hasChatProviderControls && (
            <ChatModelSettings
              id={`${chatSettingsId}-panel`}
              titleId={`${chatSettingsId}-title`}
              panelRef={chatSettingsPanelRef}
              triggerRef={chatSettingsTriggerRef}
              open={chatSettingsOpen}
              providerLabel={selectedProviderOption?.label ?? "Choose provider"}
              modelLabel={selectedModelLabel ?? ""}
              controls={chatProviderControls}
              onOpen={() => setChatSettingsOpen(true)}
              onClose={() => setChatSettingsOpen(false)}
            />
          )}
          <div className={styles.chatConversation}>{conversationContent}</div>
        </div>
      ) : conversationContent}
    </section>
  );
};

export type ThreadedDiscussionProps = ThreadCraftDiscussionProps;

export const ThreadedDiscussion = (props: ThreadedDiscussionProps): JSX.Element => (
  <Discussion {...props} />
);

export const GitHubIssueThread = (props: ThreadCraftDiscussionProps): JSX.Element => (
  <Discussion {...props} variant="issue" />
);

export const ReviewThread = (props: ThreadCraftDiscussionProps): JSX.Element => (
  <Discussion {...props} variant="review" />
);

export const ChatThread = (props: ThreadCraftDiscussionProps): JSX.Element => (
  <Discussion {...props} variant="chat" />
);
