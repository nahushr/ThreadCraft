import type { CSSProperties, JSX, ReactNode } from "react";
import type { ThreadCraftAuthorTypeStyle, ThreadCraftComment, ThreadCraftVariant } from "../types";
import { formatDate, getInitials } from "../utils/formatDate";
import { isCustomerComment, normalizeReactions, REACTION_EMOJIS } from "../utils/reactions";
import CommentAttachments from "./CommentAttachments";
import styles from "./CommentThread.module.scss";

const styleFromVariables = (values: Record<string, string | undefined>): CSSProperties | undefined => {
  const entries = Object.entries(values).filter(([, value]) => value);
  return entries.length ? Object.fromEntries(entries) as CSSProperties : undefined;
};

export interface CommentThreadProps {
  comment: ThreadCraftComment;
  authorTypeStyles?: Record<string, ThreadCraftAuthorTypeStyle>;
  depth?: number;
  showRating: boolean;
  allowReplies: boolean;
  allowReactions: boolean;
  variant: ThreadCraftVariant;
  renderCommentBody?: (comment: ThreadCraftComment) => ReactNode;
  onReply: (comment: ThreadCraftComment) => void;
  reactionCounts: Record<string, Record<string, number>>;
  selectedReactions: Record<string, string[]>;
  onReact: (comment: ThreadCraftComment, emoji: string) => void;
}

const CommentThread = ({
  comment,
  authorTypeStyles,
  depth = 0,
  showRating,
  allowReplies,
  allowReactions,
  variant,
  renderCommentBody,
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
  const authorType = comment.authorType?.toLowerCase();
  const isChatUser = variant === "chat" && (
    Boolean(comment.isMine) || authorType === "user" || authorType === "customer"
  );
  const authorTypeStyle = authorType
    ? authorTypeStyles?.[comment.authorType || ""] ?? authorTypeStyles?.[authorType]
    : undefined;
  const avatarClassName = `${styles.avatar} ${isCustomer ? styles.avatarCustomer : styles.avatarSupport}`;
  const bubbleClassName = variant === "chat"
    ? `${styles.bubble} ${isChatUser ? styles.bubbleChatUser : styles.bubbleChatAssistant}`
    : `${styles.bubble} ${isCustomer ? styles.bubbleCustomer : styles.bubbleSupport}`;
  const badgeStyle = styleFromVariables({
    "--tc-author-chip-color": authorTypeStyle?.color,
    "--tc-author-chip-background": authorTypeStyle?.backgroundColor,
    "--tc-author-chip-border": authorTypeStyle?.borderColor,
  });
  const avatarStyle = styleFromVariables({
    "--tc-avatar-background": comment.avatarBackgroundColor ?? authorTypeStyle?.avatarBackgroundColor,
    "--tc-avatar-text": comment.avatarTextColor ?? authorTypeStyle?.avatarTextColor,
    "--tc-avatar-border": comment.avatarBorderColor ?? authorTypeStyle?.avatarBorderColor,
  });
  const cardStyle = styleFromVariables({
    "--tc-comment-card-background": comment.cardColor ?? authorTypeStyle?.cardColor,
    "--tc-comment-card-border": comment.cardBorderColor ?? authorTypeStyle?.cardBorderColor,
    "--tc-comment-card-text": comment.cardTextColor ?? authorTypeStyle?.cardTextColor,
  });

  return (
    <article className={`${styles.comment} ${depth > 0 ? styles.reply : ""} ${variant === "chat" ? `${styles.chatMessage} ${isChatUser ? styles.chatMessageUser : styles.chatMessageAssistant}` : ""}`}>
      <div className={`${styles.heading} ${variant === "chat" ? styles.chatHeading : ""}`}>
        {comment.authorAvatarUrl ? (
          <img className={avatarClassName} src={comment.authorAvatarUrl} alt="" style={avatarStyle} />
        ) : (
          <span className={avatarClassName} aria-hidden="true" style={avatarStyle}>{getInitials(comment.author)}</span>
        )}
        <strong className={styles.author}>{comment.author || "Anonymous"}</strong>
        {comment.authorType && (
          <span className={styles.authorBadge} style={badgeStyle}>
            {authorTypeStyle?.icon && <span aria-hidden="true" className={styles.authorBadgeIcon}>{authorTypeStyle.icon}</span>}
            {authorTypeStyle?.label ?? comment.authorType}
          </span>
        )}
        {depth > 0 && comment.quotedAuthor && (
          <span className={styles.parentLabel}>↳ {comment.quotedAuthor}</span>
        )}
        <time className={styles.timestamp}>{formatDate(comment.createdAt)}</time>
      </div>

      <div className={bubbleClassName} style={cardStyle}>
        <div className={styles.text}>
          {renderCommentBody ? renderCommentBody(comment) : comment.text ?? comment.body ?? ""}
        </div>
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
              authorTypeStyles={authorTypeStyles}
              depth={depth + 1}
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
        </div>
      )}
    </article>
  );
};

export default CommentThread;
