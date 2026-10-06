import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { appendReplyToTree, appendUniqueRootComments, buildCommentTree, prependUniqueRootComments } from "../threadUtils";
import type {
  ThreadCraftComment,
  ThreadCraftDiscussionProps,
  ThreadCraftReplyAuthorType,
  ThreadCraftSubmitPayload,
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
  const variant = requestedVariant || data.kind || "issue";
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
  const resolvedNewCommentAuthorType = newCommentAuthorType || (variant === "review" ? "customer" : isChat ? "user" : "support");
  const resolvedReplyAuthorTypes = replyAuthorTypes?.length
    ? replyAuthorTypes
    : variant === "review"
      ? ["customer", "business"] as ThreadCraftReplyAuthorType[]
      : isChat
        ? []
        : ["support", "customer"] as ThreadCraftReplyAuthorType[];

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
        String(incomingComments[incomingComments.length - 1]?.id) === String(previousComments[previousComments.length - 1]?.id);
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
        ...(current[key] || {}),
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
      setLoadError(loadMoreErrorText || (isChat ? "Could not load older messages. Please try again." : "Could not load more comments. Please try again."));
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

  const moreButton = canLoadMore ? (
    <Pressable accessibilityRole="button" disabled={loadingMore} style={styles.moreButton} onPress={() => void handleShowMore()}>
      <Text style={styles.moreButtonText}>
        {loadingMore
          ? loadingMoreLabel || (isChat ? "Loading older messages…" : "Loading comments…")
          : loadMoreLabel || (isChat ? "Load older messages" : "See more comments")}
      </Text>
    </Pressable>
  ) : null;
  const headerTitle = variant === "review" ? "Customer reviews" : isChat ? "AI chat" : "Discussion";
  const headerAuthorLabel = variant === "review" ? "Store" : isChat ? "Assistant" : "Opened by";
  const streamTitle = variant === "review" ? "Reviews" : isChat ? "Messages" : "Discussion";

  const messageContent = (
    <>
      {olderMessagesPlacement === "start" && moreButton}
      {visibleComments.length === 0 ? (
        <Text style={styles.empty}>{emptyMessage || (isChat ? "Start a conversation with the assistant." : "No replies yet. Start the conversation.")}</Text>
      ) : visibleComments.map((comment) => (
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
          onReply={setReplyingTo}
          onReact={handleReact}
        />
      ))}
      {olderMessagesPlacement === "end" && moreButton}
      {isChat && typingIndicator && (
        <View accessibilityRole="progressbar" style={styles.typingIndicator}>
          <Text style={styles.typingText}>{typingIndicatorLabel || "AI assistant is thinking…"}</Text>
        </View>
      )}
      {loadError ? <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text> : null}
    </>
  );

  return (
    <View accessibilityLabel={variant === "review" ? "Product reviews" : isChat ? "Chat conversation" : "Issue discussion"} style={[styles.root, isChat && styles.chatRoot]}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.eyebrow}>
              {variant === "review" ? "CUSTOMER REVIEWS" : isChat ? "AI CHAT" : `GITHUB ISSUE${data.id != null ? ` #${data.id}` : ""}`}
            </Text>
            <Text style={styles.title}>{data.title || headerTitle}</Text>
            {data.body ? <Text style={styles.headerBody}>{data.body}</Text> : null}
            <View style={styles.detailRow}>
              {data.author ? <Text style={styles.detail}>{headerAuthorLabel} {data.author}</Text> : null}
              {data.createdAt ? <Text style={styles.detail}>{formatDate(data.createdAt)}</Text> : null}
              {data.status ? <Text style={styles.status}>{data.status}</Text> : null}
            </View>
          </View>
          {data.url ? (
            <Pressable onPress={() => void Linking.openURL(data.url!)}>
              <Text style={styles.externalLink}>{isChat ? "Open chat" : "View on GitHub"} ↗</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {showStreamHeading && (
        <View style={styles.streamHeading}>
          <Text style={styles.streamTitle}>{streamTitle}</Text>
          <Text style={styles.streamCount}>{totalCommentCount} {variant === "review" ? "reviews" : isChat ? "messages" : "comments"}</Text>
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
