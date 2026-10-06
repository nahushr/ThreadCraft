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

const getAuthorTypeStyle = (
  authorType: string | undefined,
  authorTypeStyles?: Record<string, ThreadCraftAuthorTypeStyle>,
): ThreadCraftAuthorTypeStyle | undefined => {
  if (!authorType) return undefined;
  return authorTypeStyles?.[authorType] ?? authorTypeStyles?.[authorType.toLowerCase()];
};

const getChatMessageClassName = (isChat: boolean, isChatUser: boolean): string => {
  if (!isChat) return "";
  return isChatUser ? styles.chatMessageUser : styles.chatMessageAssistant;
};

const getArticleClassName = (depth: number, isChat: boolean, isChatUser: boolean): string => [
  styles.comment,
  depth > 0 ? styles.reply : "",
  isChat ? styles.chatMessage : "",
  getChatMessageClassName(isChat, isChatUser),
].filter(Boolean).join(" ");

const getBubbleClassName = (isChat: boolean, isChatUser: boolean, isCustomer: boolean): string => {
  if (isChat && isChatUser) return [styles.bubble, styles.bubbleChatUser].join(" ");
  if (isChat) return [styles.bubble, styles.bubbleChatAssistant].join(" ");
  if (isCustomer) return [styles.bubble, styles.bubbleCustomer].join(" ");
  return [styles.bubble, styles.bubbleSupport].join(" ");
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

interface CommentHeadingProps {
  comment: ThreadCraftComment;
  authorTypeStyle?: ThreadCraftAuthorTypeStyle;
  avatarStyle?: CSSProperties;
  badgeStyle?: CSSProperties;
  depth: number;
  isChat: boolean;
  isCustomer: boolean;
}

const CommentHeading = ({
  comment,
  authorTypeStyle,
  avatarStyle,
  badgeStyle,
  depth,
  isChat,
  isCustomer,
}: CommentHeadingProps): JSX.Element => {
  const avatarClassName = `${styles.avatar} ${isCustomer ? styles.avatarCustomer : styles.avatarSupport}`;
  const showAuthorType = !isChat && Boolean(comment.authorType);
  const showQuotedAuthor = depth > 0 && Boolean(comment.quotedAuthor);

  return (
    <div className={`${styles.heading} ${isChat ? styles.chatHeading : ""}`}>
      {comment.authorAvatarUrl ? (
        <img className={avatarClassName} src={comment.authorAvatarUrl} alt="" style={avatarStyle} />
      ) : (
        <span className={avatarClassName} aria-hidden="true" style={avatarStyle}>{getInitials(comment.author)}</span>
      )}
      <strong className={styles.author}>{comment.author || "Anonymous"}</strong>
      {showAuthorType && (
        <span className={styles.authorBadge} style={badgeStyle}>
          {authorTypeStyle?.icon && <span aria-hidden="true" className={styles.authorBadgeIcon}>{authorTypeStyle.icon}</span>}
          {authorTypeStyle?.label ?? comment.authorType}
        </span>
      )}
      {showQuotedAuthor && <span className={styles.parentLabel}>↳ {comment.quotedAuthor}</span>}
      {!isChat && <time className={styles.timestamp}>{formatDate(comment.createdAt)}</time>}
    </div>
  );
};

interface CommentActionsProps {
  comment: ThreadCraftComment;
  reactions: Record<string, number>;
  selectedReactions: string[];
  allowReplies: boolean;
  allowReactions: boolean;
  onReply: (comment: ThreadCraftComment) => void;
  onReact: (comment: ThreadCraftComment, emoji: string) => void;
}

const CommentActions = ({
  comment,
  reactions,
  selectedReactions,
  allowReplies,
  allowReactions,
  onReply,
  onReact,
}: CommentActionsProps): JSX.Element | null => {
  if (!allowReplies && !allowReactions) return null;

  return (
    <div className={styles.actions}>
      {allowReactions && (
        <div className={styles.reactions} aria-label="Reactions">
          {REACTION_EMOJIS.map((emoji) => {
            const count = reactions[emoji] || 0;
            const selected = selectedReactions.includes(emoji);
            const label = count > 0 ? `React with ${emoji}, ${count} reactions` : `React with ${emoji}`;
            return (
              <button
                aria-label={label}
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
  );
};

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
  const reactions = { ...normalizeReactions(comment.reactions), ...reactionCounts[commentKey] };
  const rating = comment.rating ?? comment.ratings;
  const isCustomer = isCustomerComment(comment);
  const authorTypeStyle = getAuthorTypeStyle(comment.authorType, authorTypeStyles);
  const isChat = variant === "chat";
  const isChatUser = isChat && (
    Boolean(comment.isMine) || comment.authorType?.toLowerCase() === "user" || comment.authorType?.toLowerCase() === "customer"
  );
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
    <article className={getArticleClassName(depth, isChat, isChatUser)}>
      <CommentHeading
        comment={comment}
        authorTypeStyle={authorTypeStyle}
        avatarStyle={avatarStyle}
        badgeStyle={badgeStyle}
        depth={depth}
        isChat={isChat}
        isCustomer={isCustomer}
      />
      <div className={getBubbleClassName(isChat, isChatUser, isCustomer)} style={cardStyle}>
        <div className={styles.text}>
          {renderCommentBody ? renderCommentBody(comment) : comment.text ?? comment.body ?? ""}
        </div>
        {showRating && rating != null && (
          <div className={styles.rating} aria-label={`Rated ${rating} out of 5`}>
            <span aria-hidden="true">
              {"★".repeat(Math.max(0, Math.min(5, Math.round(rating))))}
              {"☆".repeat(5 - Math.max(0, Math.min(5, Math.round(rating))))}
            </span>
            <span className={styles.ratingValue}>{rating}/5</span>
          </div>
        )}
        <CommentAttachments attachments={comment.attachments} />
        {isChat && (
          <time className={`${styles.timestamp} ${styles.chatTimestamp}`}>
            {formatDate(comment.createdAt)}
          </time>
        )}
        <CommentActions
          comment={comment}
          reactions={reactions}
          selectedReactions={selectedReactions[commentKey] || []}
          allowReplies={allowReplies}
          allowReactions={allowReactions}
          onReply={onReply}
          onReact={onReact}
        />
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
