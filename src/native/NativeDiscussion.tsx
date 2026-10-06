import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { appendReplyToTree, appendUniqueRootComments, buildCommentTree } from "../threadUtils";
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
  onPickAttachments,
  onLoadMore,
  onSubmitComment,
  onReact,
}: ThreadCraftDiscussionProps): JSX.Element => {
  const variant = requestedVariant || data.kind || "issue";
  const initialLimit = Math.max(1, initialRootLimit || 50);
  const pageSize = Math.max(1, loadMoreCount || initialLimit);
  const normalizedComments = useMemo(() => buildCommentTree(data.comments || []), [data.comments]);
  const dataKey = `${variant}:${String(data.id ?? data.title)}`;
  const [comments, setComments] = useState(normalizedComments);
  const [visibleRootCount, setVisibleRootCount] = useState(initialLimit);
  const [hasMore, setHasMore] = useState(data.hasMore ?? normalizedComments.length > initialLimit);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ThreadCraftComment | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});
  const [selectedReactions, setSelectedReactions] = useState<Record<string, string[]>>({});
  const lastDataKey = useRef(dataKey);
  const showRating = showRatingProp ?? (variant === "review" && data.showRating === true);
  const allowRatingInput = allowRatingInputProp ?? showRating;
  const resolvedNewCommentAuthorType = newCommentAuthorType || (variant === "review" ? "customer" : "support");
  const resolvedReplyAuthorTypes = replyAuthorTypes?.length
    ? replyAuthorTypes
    : variant === "review"
      ? ["customer", "business"] as ThreadCraftReplyAuthorType[]
      : ["support", "customer"] as ThreadCraftReplyAuthorType[];

  useEffect(() => {
    if (lastDataKey.current === dataKey) return;
    lastDataKey.current = dataKey;
    setComments(normalizedComments);
    setVisibleRootCount(initialLimit);
    setHasMore(data.hasMore ?? normalizedComments.length > initialLimit);
    setReplyingTo(null);
    setLoadError("");
    setReactionCounts({});
    setSelectedReactions({});
  }, [data.hasMore, dataKey, initialLimit, normalizedComments]);

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
      setComments((current) => appendUniqueRootComments(current, nextComments));
      setVisibleRootCount((current) => current + nextComments.length);
      setHasMore(result.hasMore ?? nextComments.length >= pageSize);
    } catch {
      setLoadError("Could not load more comments. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (payload: ThreadCraftSubmitPayload): Promise<void> => {
    const saved = await onSubmitComment?.(payload);
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
      setComments((current) => newCommentPosition === "start" ? [comment, ...current] : [...current, comment]);
      setVisibleRootCount((current) => Math.max(current, comments.length + 1));
    }
    setReplyingTo(null);
  };

  const headerTitle = variant === "review" ? "Customer reviews" : "Discussion";
  const headerAuthorLabel = variant === "review" ? "Store" : "Opened by";

  return (
    <View accessibilityLabel={variant === "review" ? "Product reviews" : "Issue discussion"} style={styles.root}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.eyebrow}>
              {variant === "review" ? "CUSTOMER REVIEWS" : `GITHUB ISSUE${data.id != null ? ` #${data.id}` : ""}`}
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
              <Text style={styles.externalLink}>View on GitHub ↗</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View style={styles.streamHeading}>
        <Text style={styles.streamTitle}>{variant === "review" ? "Reviews" : "Discussion"}</Text>
        <Text style={styles.streamCount}>{totalCommentCount} {variant === "review" ? "reviews" : "comments"}</Text>
      </View>

      <View style={styles.stream}>
        {visibleComments.length === 0 ? (
          <Text style={styles.empty}>No replies yet. Start the conversation.</Text>
        ) : visibleComments.map((comment) => (
          <NativeCommentCard
            key={comment.id}
            comment={comment}
            authorTypeStyles={data.authorTypeStyles}
            depth={0}
            showRating={showRating}
            allowReplies={allowReplies}
            allowReactions={allowReactions}
            reactionCounts={reactionCounts}
            selectedReactions={selectedReactions}
            onReply={setReplyingTo}
            onReact={handleReact}
          />
        ))}
        {canLoadMore && (
          <Pressable accessibilityRole="button" disabled={loadingMore} style={styles.moreButton} onPress={() => void handleShowMore()}>
            <Text style={styles.moreButtonText}>{loadingMore ? "Loading comments…" : "See more comments"}</Text>
          </Pressable>
        )}
        {loadError ? <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text> : null}
      </View>

      {(allowNewComments || (allowReplies && replyingTo != null)) && (
        <NativeComposer
          variant={variant}
          replyingTo={replyingTo}
          showRating={showRating}
          allowRatingInput={allowRatingInput}
          allowAttachments={allowAttachments}
          replyAuthorTypes={resolvedReplyAuthorTypes}
          newCommentAuthorType={resolvedNewCommentAuthorType}
          identityFields={identityFields}
          onPickAttachments={onPickAttachments}
          onCancelReply={() => setReplyingTo(null)}
          onSubmit={handleSubmit}
        />
      )}
    </View>
  );
};

export default NativeDiscussion;
