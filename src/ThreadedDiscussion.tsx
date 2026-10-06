import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import type {
  ThreadCraftComment,
  ThreadCraftDiscussionProps,
  ThreadCraftId,
  ThreadCraftSubmitPayload,
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

const isOlderHistory = (
  current: ThreadCraftComment[],
  next: ThreadCraftComment[],
): boolean => Boolean(
  current.length > 0 &&
  next.length > current.length &&
  String(next[0]?.id) !== String(current[0]?.id) &&
  next.some((comment) => String(comment.id) === String(current[0]?.id)) &&
  String(next[next.length - 1]?.id) === String(current[current.length - 1]?.id),
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
  const variant = requestedVariant || data.kind || "issue";
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
  const lastDataKey = useRef(dataKey);
  const lastSyncedData = useRef({ dataKey, comments: data.comments, hasMore: data.hasMore });
  const streamRef = useRef<HTMLDivElement | null>(null);
  const scrollIntent = useRef<{ kind: "bottom" } | { kind: "preserve"; top: number; height: number }>({ kind: "bottom" });
  const showRating = showRatingProp ?? (variant === "review" && data.showRating === true);
  const allowRatingInput = allowRatingInputProp ?? showRating;
  const resolvedNewCommentAuthorType = newCommentAuthorType ?? (variant === "review" ? "customer" : isChat ? "user" : "support");
  const resolvedReplyAuthorTypes = replyAuthorTypes?.length
    ? replyAuthorTypes
    : variant === "review"
      ? ["customer", "business"] as const
      : isChat
        ? [] as const
        : ["support", "customer"] as const;
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

  const visibleComments = comments.slice(0, visibleRootCount);
  const canLoadMore = comments.length > visibleRootCount || (hasMore && Boolean(onLoadMore));
  const commentCount = countComments(comments);
  const sectionTitle = variant === "review" ? "Customer reviews" : isChat ? "Messages" : "Discussion";

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
          ...(current[commentKey] || {}),
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
      setLoadError(loadMoreErrorText ?? (isChat ? "Could not load older messages. Please try again." : "Could not load more comments. Please try again."));
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

  const moreButton = canLoadMore ? (
    <button
      className={`${styles.moreButton} ${olderMessagesPlacement === "start" ? styles.chatMoreButtonStart : ""}`}
      disabled={loadingMore}
      type="button"
      onClick={() => void handleShowMore()}
    >
      {loadingMore
        ? loadingMoreLabel ?? (isChat ? "Loading older messages…" : "Loading comments…")
        : loadMoreLabel ?? (isChat ? "Load older messages" : "See more comments")}
    </button>
  ) : null;

  return (
    <section
      aria-label={variant === "review" ? "Product reviews" : isChat ? "Chat conversation" : "Issue discussion"}
      className={`${styles.root} ${isChat ? styles.chatRoot : ""}`.trim()}
    >
      {showHeader && <DiscussionHeader data={data} variant={variant} />}

      {hasChatProviderControls && (
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
      )}

      {showStreamHeading && (
        <div className={styles.streamHeading}>
          <strong>{sectionTitle}</strong>
          <span>
            {data.totalRootComments ?? commentCount} {variant === "review" ? "reviews" : isChat ? "messages" : "comments"}
          </span>
        </div>
      )}

      <div
        aria-label={isChat ? "Conversation messages" : undefined}
        className={`${styles.stream} ${isChat ? styles.chatStream : ""}`.trim()}
        ref={streamRef}
        tabIndex={isChat ? 0 : undefined}
      >
        {olderMessagesPlacement === "start" && moreButton}
        {visibleComments.length === 0 ? (
          <p className={styles.empty}>{emptyMessage ?? (isChat ? "Start a conversation with the assistant." : "No replies yet. Start the conversation.")}</p>
        ) : (
          visibleComments.map((comment) => (
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
              onReply={handleReply}
              reactionCounts={reactionCounts}
              selectedReactions={selectedReactions}
              onReact={handleReact}
            />
          ))
        )}
        {olderMessagesPlacement === "end" && moreButton}
        {isChat && typingIndicator && <ChatTypingIndicator label={typingIndicatorLabel} />}
        {loadError && <p className={styles.error} role="alert">{loadError}</p>}
      </div>

      {(allowNewComments || (allowReplies && replyingTo != null)) && (
        <CommentComposer
          variant={variant}
          showRating={showRating}
          allowRatingInput={allowRatingInput}
          allowAttachments={allowAttachments}
          allowEmoji={allowEmoji}
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
      )}
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
