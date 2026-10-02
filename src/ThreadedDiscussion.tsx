import { useEffect, useMemo, useRef, useState } from "react";
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
} from "./threadUtils";
import { normalizeReactions } from "./utils/reactions";
import CommentComposer from "./components/CommentComposer";
import CommentThread from "./components/CommentThread";
import DiscussionHeader from "./components/DiscussionHeader";
import styles from "./ThreadedDiscussion.module.scss";

const createCommentId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `comment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const countComments = (comments: ThreadCraftComment[]): number =>
  comments.reduce((total, comment) => total + 1 + countComments(comment.replies || []), 0);

const getParentId = (comment: ThreadCraftComment | null): ThreadCraftId | undefined =>
  comment?.id;

const Discussion = ({
  data,
  variant: requestedVariant,
  currentUser = "You",
  showHeader = true,
  initialRootLimit = 50,
  loadMoreCount,
  allowReplies = true,
  allowAttachments = true,
  allowReactions = true,
  onLoadMore,
  onSubmitComment,
  onReact,
}: ThreadCraftDiscussionProps): JSX.Element => {
  const variant = requestedVariant || data.kind || "issue";
  const pageSize = Math.max(1, loadMoreCount || initialRootLimit || 50);
  const initialLimit = Math.max(1, initialRootLimit || 50);
  const normalizedComments = useMemo(
    () => buildCommentTree(data.comments || []),
    [data.comments],
  );
  const dataKey = `${variant}:${String(data.id ?? data.title)}`;
  const [comments, setComments] = useState(normalizedComments);
  const [visibleRootCount, setVisibleRootCount] = useState(initialLimit);
  const [hasMore, setHasMore] = useState(
    data.hasMore ?? normalizedComments.length > initialLimit,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ThreadCraftComment | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});
  const [selectedReactions, setSelectedReactions] = useState<Record<string, string[]>>({});
  const lastDataKey = useRef(dataKey);
  const showRating = variant === "review" && data.showRating === true;

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
  const commentCount = countComments(comments);
  const sectionTitle = variant === "review" ? "Customer reviews" : "Discussion";

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
        author: currentUser,
        text: payload.text,
        createdAt: new Date().toISOString(),
        authorType: payload.authorType ?? "customer",
        attachments: payload.attachments,
        reactions: {},
        rating: payload.rating,
      };
    const parentId = getParentId(replyingTo);

    if (parentId != null) {
      setComments((current) => appendReplyToTree(current, parentId, comment));
    } else {
      setComments((current) => [...current, comment]);
      setVisibleRootCount((current) => Math.max(current, comments.length + 1));
    }
    setReplyingTo(null);
  };

  return (
    <section
      aria-label={variant === "review" ? "Product reviews" : "Issue discussion"}
      className={styles.root}
    >
      {showHeader && <DiscussionHeader data={data} variant={variant} />}

      <div className={styles.streamHeading}>
        <strong>{sectionTitle}</strong>
        <span>
          {data.totalRootComments ?? commentCount} {variant === "review" ? "reviews" : "comments"}
        </span>
      </div>

      <div className={styles.stream}>
        {visibleComments.length === 0 ? (
          <p className={styles.empty}>No replies yet. Start the conversation.</p>
        ) : (
          visibleComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              depth={0}
              showRating={showRating}
              allowReplies={allowReplies}
              allowReactions={allowReactions}
              onReply={handleReply}
              reactionCounts={reactionCounts}
              selectedReactions={selectedReactions}
              onReact={handleReact}
            />
          ))
        )}
        {canLoadMore && (
          <button
            className={styles.moreButton}
            disabled={loadingMore}
            type="button"
            onClick={() => void handleShowMore()}
          >
            {loadingMore ? "Loading comments…" : "See more comments"}
          </button>
        )}
        {loadError && <p className={styles.error} role="alert">{loadError}</p>}
      </div>

      <CommentComposer
        variant={variant}
        showRating={showRating}
        allowAttachments={allowAttachments}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSubmit={handleSubmit}
      />
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
