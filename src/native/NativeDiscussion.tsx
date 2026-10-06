import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { appendReplyToTree, appendUniqueRootComments, buildCommentTree, prependUniqueRootComments } from "../threadUtils";
import type {
  ThreadCraftComment,
  ThreadCraftDiscussionProps,
  ThreadCraftReplyAuthorType,
  ThreadCraftSubmitPayload,
  ThreadCraftVariant,
} from "../types";
import { formatDate } from "../utils/formatDate";
import { normalizeReactions } from "../utils/reactions";
import NativeCommentCard from "./NativeCommentCard";
import NativeComposer from "./NativeComposer";
import { nativeStyles as styles } from "./styles";

let fallbackIdSequence = 0;

const createCommentId = (): string => {
  fallbackIdSequence += 1;
  return `threadcraft-${Date.now()}-${fallbackIdSequence}`;
};

const countComments = (comments: ThreadCraftComment[]): number =>
  comments.reduce((total, comment) => total + 1 + countComments(comment.replies || []), 0);

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
): ThreadCraftReplyAuthorType[] => {
  if (options?.length) return options;
  if (variant === "review") return ["customer", "business"];
  if (variant === "chat") return [];
  return ["support", "customer"];
};

const getHeaderTitle = (variant: NonNullable<ThreadCraftDiscussionProps["variant"]>): string => {
  if (variant === "review") return "Customer reviews";
  if (variant === "chat") return "AI chat";
  return "Discussion";
};

const getHeaderAuthorLabel = (variant: NonNullable<ThreadCraftDiscussionProps["variant"]>): string => {
  if (variant === "review") return "Store";
  if (variant === "chat") return "Assistant";
  return "Opened by";
};

const getHeaderEyebrow = (
  variant: NonNullable<ThreadCraftDiscussionProps["variant"]>,
  id: ThreadCraftDiscussionProps["data"]["id"],
): string => {
  if (variant === "review") return "CUSTOMER REVIEWS";
  if (variant === "chat") return "AI CHAT";
  if (id == null) return "GITHUB ISSUE";
  return `GITHUB ISSUE #${id}`;
};

const getStreamTitle = (variant: NonNullable<ThreadCraftDiscussionProps["variant"]>): string => {
  if (variant === "review") return "Reviews";
  if (variant === "chat") return "Messages";
  return "Discussion";
};

const getCommentNoun = (variant: NonNullable<ThreadCraftDiscussionProps["variant"]>): string => {
  if (variant === "review") return "reviews";
  if (variant === "chat") return "messages";
  return "comments";
};

const getSectionLabel = (variant: NonNullable<ThreadCraftDiscussionProps["variant"]>): string => {
  if (variant === "review") return "Product reviews";
  if (variant === "chat") return "Chat conversation";
  return "Issue discussion";
};

const getEmptyMessage = (
  override: string | undefined,
  variant: NonNullable<ThreadCraftDiscussionProps["variant"]>,
): string => {
  if (override) return override;
  if (variant === "chat") return "Start a conversation with the assistant.";
  return "No replies yet. Start the conversation.";
};

const getLoadErrorMessage = (
  override: string | undefined,
  variant: NonNullable<ThreadCraftDiscussionProps["variant"]>,
): string => {
  if (override) return override;
  if (variant === "chat") return "Could not load older messages. Please try again.";
  return "Could not load more comments. Please try again.";
};

const getMoreButtonText = (
  isLoading: boolean,
  loadingLabel: string | undefined,
  label: string | undefined,
  variant: NonNullable<ThreadCraftDiscussionProps["variant"]>,
): string => {
  if (isLoading) {
    if (loadingLabel) return loadingLabel;
    if (variant === "chat") return "Loading older messages…";
    return "Loading comments…";
  }
  if (label) return label;
  if (variant === "chat") return "Load older messages";
  return "See more comments";
};

const NativeDiscussionHeader = ({
  data,
  variant,
}: {
  data: ThreadCraftDiscussionProps["data"];
  variant: ThreadCraftVariant;
}): JSX.Element => {
  const url = data.url;
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.eyebrow}>{getHeaderEyebrow(variant, data.id)}</Text>
        <Text style={styles.title}>{data.title || getHeaderTitle(variant)}</Text>
        {data.body ? <Text style={styles.headerBody}>{data.body}</Text> : null}
        <View style={styles.detailRow}>
          {data.author ? <Text style={styles.detail}>{getHeaderAuthorLabel(variant)} {data.author}</Text> : null}
          {data.createdAt ? <Text style={styles.detail}>{formatDate(data.createdAt)}</Text> : null}
          {data.status ? <Text style={styles.status}>{data.status}</Text> : null}
        </View>
      </View>
      {url ? (
        <Pressable onPress={() => void Linking.openURL(url)}>
          <Text style={styles.externalLink}>{variant === "chat" ? "Open chat" : "View on GitHub"} ↗</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

interface NativeMessagesProps {
  data: ThreadCraftDiscussionProps["data"];
  comments: ThreadCraftComment[];
  variant: ThreadCraftVariant;
  emptyMessage?: string;
  typingIndicator: boolean;
  typingIndicatorLabel?: string;
  loadError: string;
  showRating: boolean;
  allowReplies: boolean;
  allowReactions: boolean;
  renderCommentBody: ThreadCraftDiscussionProps["renderCommentBody"];
  reactionCounts: Record<string, Record<string, number>>;
  selectedReactions: Record<string, string[]>;
  moreButton: JSX.Element | null;
  olderMessagesPlacement: "start" | "end";
  onReply: (comment: ThreadCraftComment) => void;
  onReact: (comment: ThreadCraftComment, emoji: string) => void;
}

const NativeMessages = ({
  data,
  comments,
  variant,
  emptyMessage,
  typingIndicator,
  typingIndicatorLabel,
  loadError,
  showRating,
  allowReplies,
  allowReactions,
  renderCommentBody,
  reactionCounts,
  selectedReactions,
  moreButton,
  olderMessagesPlacement,
  onReply,
  onReact,
}: NativeMessagesProps): JSX.Element => (
  <>
    {olderMessagesPlacement === "start" && moreButton}
    {comments.length === 0 ? (
      <Text style={styles.empty}>{getEmptyMessage(emptyMessage, variant)}</Text>
    ) : comments.map((comment) => (
      <NativeCommentCard
        key={comment.id}
        comment={comment}
        authorTypeStyles={data.authorTypeStyles}
        depth={0}
        variant={variant}
        renderCommentBody={renderCommentBody}
        showRating={showRating}
        allowReplies={allowReplies}
        allowReactions={allowReactions}
        reactionCounts={reactionCounts}
        selectedReactions={selectedReactions}
        onReply={onReply}
        onReact={onReact}
      />
    ))}
    {olderMessagesPlacement === "end" && moreButton}
    {variant === "chat" && typingIndicator && (
      <View accessibilityRole="progressbar" style={styles.typingIndicator}>
        <Text style={styles.typingText}>{typingIndicatorLabel || "AI assistant is thinking…"}</Text>
      </View>
    )}
    {loadError ? <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text> : null}
  </>
);

interface ChatScrollViewHandle {
  scrollTo: (options: { y: number; animated?: boolean }) => void;
  scrollToEnd: (options?: { animated?: boolean }) => void;
}

const NativeDiscussion = ({
  data,
  variant: requestedVariant,
  currentUser = "You",
  showHeader = true,
  initialRootLimit = 50,
  loadMoreCount,
  allowReplies = true,
  allowNewComments = true,
  allowAttachments = true,
  allowReactions = true,
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
  allowEmoji = true,
  typingIndicator = false,
  typingIndicatorLabel,
  isSubmitting = false,
  controlledComments = false,
  renderCommentBody,
  onPickAttachments,
  onLoadMore,
  onSubmitComment,
  onReact,
}: ThreadCraftDiscussionProps): JSX.Element => {
  const variant = getDiscussionVariant(requestedVariant, data);
  const isChat = variant === "chat";
  const olderMessagesPlacement = loadMorePlacement || (isChat ? "start" : "end");
  const initialLimit = Math.max(1, initialRootLimit || 50);
  const pageSize = Math.max(1, loadMoreCount || initialLimit);
  const normalizedComments = useMemo(() => buildCommentTree(data.comments || []), [data.comments]);
  const dataKey = `${variant}:${String(data.id ?? data.title)}`;
  const [comments, setComments] = useState(normalizedComments);
  const [visibleRootCount, setVisibleRootCount] = useState(isChat ? Math.max(initialLimit, normalizedComments.length) : initialLimit);
  const [hasMore, setHasMore] = useState(data.hasMore ?? normalizedComments.length > initialLimit);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ThreadCraftComment | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});
  const [selectedReactions, setSelectedReactions] = useState<Record<string, string[]>>({});
  const lastDataKey = useRef(dataKey);
  const lastSyncedData = useRef({ dataKey, comments: data.comments, hasMore: data.hasMore });
  const chatScrollRef = useRef<ChatScrollViewHandle | null>(null);
  const scrollToBottom = useRef(true);
  const preserveScroll = useRef(false);
  const previousContentHeight = useRef(0);
  const currentScrollOffset = useRef(0);
  const showRating = showRatingProp ?? (variant === "review" && data.showRating === true);
  const allowRatingInput = allowRatingInputProp ?? showRating;
  const resolvedNewCommentAuthorType = getNewCommentAuthorType(newCommentAuthorType, variant);
  const resolvedReplyAuthorTypes = getReplyAuthorTypes(replyAuthorTypes, variant);

  useEffect(() => {
    if (controlledComments) {
      const previous = lastSyncedData.current;
      const keyChanged = previous.dataKey !== dataKey;
      if (!keyChanged && previous.comments === data.comments && previous.hasMore === data.hasMore) return;
      const previousComments = previous.comments || [];
      const incomingComments = data.comments || [];
      const olderHistory = isChat && !keyChanged && previousComments.length > 0 && incomingComments.length > previousComments.length &&
        String(incomingComments[0]?.id) !== String(previousComments[0]?.id) &&
        incomingComments.some((comment) => String(comment.id) === String(previousComments[0]?.id)) &&
        String(incomingComments.at(-1)?.id) === String(previousComments.at(-1)?.id);
      if (olderHistory) preserveScroll.current = true;
      else if (isChat) scrollToBottom.current = true;
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

  const visibleComments = comments.slice(0, visibleRootCount);
  const canLoadMore = comments.length > visibleRootCount || (hasMore && Boolean(onLoadMore));
  const totalCommentCount = data.totalRootComments ?? countComments(comments);

  const handleReact = (comment: ThreadCraftComment, emoji: string): void => {
    const key = String(comment.id);
    const wasSelected = selectedReactions[key]?.includes(emoji) || false;
    const initialCount = normalizeReactions(comment.reactions)[emoji] || 0;
    setSelectedReactions((current) => {
      const selected = new Set(current[key] || []);
      if (selected.has(emoji)) selected.delete(emoji);
      else selected.add(emoji);
      return { ...current, [key]: [...selected] };
    });
    setReactionCounts((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [emoji]: Math.max(0, (current[key]?.[emoji] ?? initialCount) + (wasSelected ? -1 : 1)),
      },
    }));
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
        preserveScroll.current = true;
        setComments((current) => prependUniqueRootComments(current, nextComments));
      } else {
        scrollToBottom.current = true;
        setComments((current) => appendUniqueRootComments(current, nextComments));
      }
      setVisibleRootCount((current) => current + nextComments.length);
    } catch {
      setLoadError(getLoadErrorMessage(loadMoreErrorText, variant));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (payload: ThreadCraftSubmitPayload): Promise<void> => {
    const saved = await onSubmitComment?.(payload);
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
    if (replyingTo) {
      setComments((current) => appendReplyToTree(current, replyingTo.id, comment));
    } else {
      scrollToBottom.current = true;
      setComments((current) => newCommentPosition === "start" ? [comment, ...current] : [...current, comment]);
      setVisibleRootCount((current) => Math.max(current, comments.length + 1));
    }
    setReplyingTo(null);
  };

  const handleChatContentSizeChange = (_width: number, height: number): void => {
    if (preserveScroll.current) {
      const nextOffset = currentScrollOffset.current + Math.max(0, height - previousContentHeight.current);
      chatScrollRef.current?.scrollTo({ y: nextOffset, animated: false });
      preserveScroll.current = false;
    } else if (scrollToBottom.current) {
      chatScrollRef.current?.scrollToEnd({ animated: true });
      scrollToBottom.current = false;
    }
    previousContentHeight.current = height;
  };

  const moreButtonLabel = getMoreButtonText(loadingMore, loadingMoreLabel, loadMoreLabel, variant);
  const moreButton = canLoadMore ? (
    <Pressable accessibilityRole="button" disabled={loadingMore} style={styles.moreButton} onPress={() => void handleShowMore()}>
      <Text style={styles.moreButtonText}>{moreButtonLabel}</Text>
    </Pressable>
  ) : null;
  const streamTitle = getStreamTitle(variant);
  const messageContent = (
    <NativeMessages
      data={data}
      comments={visibleComments}
      variant={variant}
      emptyMessage={emptyMessage}
      typingIndicator={typingIndicator}
      typingIndicatorLabel={typingIndicatorLabel}
      loadError={loadError}
      showRating={showRating}
      allowReplies={allowReplies}
      allowReactions={allowReactions}
      renderCommentBody={renderCommentBody}
      reactionCounts={reactionCounts}
      selectedReactions={selectedReactions}
      moreButton={moreButton}
      olderMessagesPlacement={olderMessagesPlacement}
      onReply={setReplyingTo}
      onReact={handleReact}
    />
  );

  return (
    <View accessibilityLabel={getSectionLabel(variant)} style={[styles.root, isChat && styles.chatRoot]}>
      {showHeader && <NativeDiscussionHeader data={data} variant={variant} />}

      {showStreamHeading && (
        <View style={styles.streamHeading}>
          <Text style={styles.streamTitle}>{streamTitle}</Text>
          <Text style={styles.streamCount}>{totalCommentCount} {getCommentNoun(variant)}</Text>
        </View>
      )}

      {isChat ? (
        <ScrollView
          ref={(instance: unknown) => { chatScrollRef.current = instance as ChatScrollViewHandle | null; }}
          contentContainerStyle={styles.chatStreamContent}
          onContentSizeChange={handleChatContentSizeChange}
          onScroll={(event: { nativeEvent: { contentOffset: { y: number } } }) => { currentScrollOffset.current = event.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          style={styles.chatStream}
        >
          {messageContent}
        </ScrollView>
      ) : (
        <View style={styles.stream}>{messageContent}</View>
      )}

      {(allowNewComments || (allowReplies && replyingTo != null)) && (
        <NativeComposer
          variant={variant}
          replyingTo={replyingTo}
          showRating={showRating}
          allowRatingInput={allowRatingInput}
          allowAttachments={allowAttachments}
          allowEmoji={allowEmoji}
          replyAuthorTypes={resolvedReplyAuthorTypes}
          newCommentAuthorType={resolvedNewCommentAuthorType}
          identityFields={identityFields}
          inputPlaceholder={inputPlaceholder}
          composerLabel={composerLabel}
          submitButtonLabel={submitButtonLabel}
          submittingLabel={submittingLabel}
          isSubmitting={isSubmitting}
          onPickAttachments={onPickAttachments}
          onCancelReply={() => setReplyingTo(null)}
          onSubmit={handleSubmit}
        />
      )}
    </View>
  );
};

export default NativeDiscussion;
