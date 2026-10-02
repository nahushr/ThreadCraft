import type { JSX } from "react";
import type { ThreadCraftComment } from "../types";
import { formatDate, getInitials } from "../utils/formatDate";
import { isCustomerComment, normalizeReactions, REACTION_EMOJIS } from "../utils/reactions";
import CommentAttachments from "./CommentAttachments";
import styles from "./CommentThread.module.scss";

export interface CommentThreadProps {
  comment: ThreadCraftComment;
  depth?: number;
  showRating: boolean;
  allowReplies: boolean;
  allowReactions: boolean;
  onReply: (comment: ThreadCraftComment) => void;
  reactionCounts: Record<string, Record<string, number>>;
  selectedReactions: Record<string, string[]>;
  onReact: (comment: ThreadCraftComment, emoji: string) => void;
}

const CommentThread = ({
  comment,
  depth = 0,
  showRating,
  allowReplies,
  allowReactions,
  onReply,
  reactionCounts,
  selectedReactions,
  onReact,
}: CommentThreadProps): JSX.Element => {
  const commentKey = String(comment.id);
  const baseReactions = normalizeReactions(comment.reactions);
  const reactions = { ...baseReactions, ...(reactionCounts[commentKey] || {}) };
  const rating = comment.rating ?? comment.ratings;
  const isCustomer = isCustomerComment(comment);
  const avatarClassName = `${styles.avatar} ${isCustomer ? styles.avatarCustomer : styles.avatarSupport}`;
  const bubbleClassName = `${styles.bubble} ${isCustomer ? styles.bubbleCustomer : styles.bubbleSupport}`;

  return (
    <article className={`${styles.comment} ${depth > 0 ? styles.reply : ""}`}>
      <div className={styles.heading}>
        {comment.authorAvatarUrl ? (
          <img className={avatarClassName} src={comment.authorAvatarUrl} alt="" />
        ) : (
          <span className={avatarClassName} aria-hidden="true">{getInitials(comment.author)}</span>
        )}
        <strong className={styles.author}>{comment.author || "Anonymous"}</strong>
        {comment.authorType && <span className={styles.authorBadge}>{comment.authorType}</span>}
        {depth > 0 && comment.quotedAuthor && (
          <span className={styles.parentLabel}>↳ {comment.quotedAuthor}</span>
        )}
        <time className={styles.timestamp}>{formatDate(comment.createdAt)}</time>
      </div>

      <div className={bubbleClassName}>
        <p className={styles.text}>{comment.text ?? comment.body ?? ""}</p>
        {showRating && rating != null && (
          <div className={styles.rating} aria-label={`Rated ${rating} out of 5`}>
            <span aria-hidden="true">
              {"★".repeat(Math.max(0, Math.min(5, Math.round(rating)) ))}
              {"☆".repeat(5 - Math.max(0, Math.min(5, Math.round(rating))))}
            </span>
            <span className={styles.ratingValue}>{rating}/5</span>
          </div>
        )}
        <CommentAttachments attachments={comment.attachments} />

        {(allowReplies || allowReactions) && (
          <div className={styles.actions}>
            {allowReactions && (
              <div className={styles.reactions} aria-label="Reactions">
                {REACTION_EMOJIS.map((emoji) => {
                  const count = reactions[emoji] || 0;
                  const selected = selectedReactions[commentKey]?.includes(emoji) || false;
                  return (
                    <button
                      aria-label={`React with ${emoji}${count ? `, ${count} reactions` : ""}`}
                      aria-pressed={selected}
                      className={`${styles.reaction} ${selected ? styles.reactionSelected : ""}`}
                      key={emoji}
                      title={`React with ${emoji}`}
                      type="button"
                      onClick={() => onReact(comment, emoji)}
                    >
                      {emoji}{count > 0 && <span>{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {allowReplies && (
              <button className={styles.replyButton} type="button" onClick={() => onReply(comment)}>
                Reply
              </button>
            )}
          </div>
        )}
      </div>

      {!!comment.replies?.length && (
        <div className={styles.replies}>
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              showRating={showRating}
              allowReplies={allowReplies}
              allowReactions={allowReactions}
              onReply={onReply}
              reactionCounts={reactionCounts}
              selectedReactions={selectedReactions}
              onReact={onReact}
            />
          ))}
        </div>
      )}
    </article>
  );
};

export default CommentThread;
