import type { JSX, ReactNode } from "react";
import {
  Image,
  type ImageStyle,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import type { ThreadCraftAuthorTypeStyle, ThreadCraftComment, ThreadCraftVariant } from "../types";
import { formatDate, getInitials } from "../utils/formatDate";
import { normalizeReactions, REACTION_EMOJIS } from "../utils/reactions";
import { nativeStyles as styles } from "./styles";

const IMAGE_EXTENSIONS = new Set(["avif", "gif", "jpeg", "jpg", "png", "webp"]);

const hasImageExtension = (value: string): boolean => {
  const path = value.split(/[?#]/, 1)[0] ?? "";
  const extension = path.split(".").at(-1)?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
};

interface NativeCommentCardProps {
  comment: ThreadCraftComment;
  authorTypeStyles?: Record<string, ThreadCraftAuthorTypeStyle>;
  depth: number;
  variant: ThreadCraftVariant;
  renderCommentBody?: (comment: ThreadCraftComment) => ReactNode;
  showRating: boolean;
  allowReplies: boolean;
  allowReactions: boolean;
  reactionCounts: Record<string, Record<string, number>>;
  selectedReactions: Record<string, string[]>;
  onReply: (comment: ThreadCraftComment) => void;
  onReact: (comment: ThreadCraftComment, emoji: string) => void;
}

const findAuthorStyle = (
  authorType: string | undefined,
  authorTypeStyles?: Record<string, ThreadCraftAuthorTypeStyle>,
): ThreadCraftAuthorTypeStyle | undefined => {
  if (!authorType) return undefined;
  return authorTypeStyles?.[authorType] ?? authorTypeStyles?.[authorType.toLowerCase()];
};

const NativeCommentCard = ({
  comment,
  authorTypeStyles,
  depth,
  variant,
  renderCommentBody,
  showRating,
  allowReplies,
  allowReactions,
  reactionCounts,
  selectedReactions,
  onReply,
  onReact,
}: NativeCommentCardProps): JSX.Element => {
  const roleStyle = findAuthorStyle(comment.authorType, authorTypeStyles);
  const commentKey = String(comment.id);
  const reactions = { ...normalizeReactions(comment.reactions), ...reactionCounts[commentKey] };
  const selected = selectedReactions[commentKey] || [];
  const rating = comment.rating ?? comment.ratings;
  const isChatUser = variant === "chat" && (
    Boolean(comment.isMine) || comment.authorType?.toLowerCase() === "user" || comment.authorType?.toLowerCase() === "customer"
  );

  return (
    <View style={[
      styles.comment,
      depth > 0 && styles.replies,
      variant === "chat" && styles.chatMessage,
      variant === "chat" && isChatUser && styles.chatMessageUser,
    ]}>
      <View style={styles.commentHeading}>
        <View style={[
          styles.avatar,
          {
            backgroundColor: comment.avatarBackgroundColor || roleStyle?.avatarBackgroundColor || "#eef2ff",
            borderColor: comment.avatarBorderColor || roleStyle?.avatarBorderColor || "#e4e7ec",
          },
        ]}>
          {comment.authorAvatarUrl ? (
            <Image source={{ uri: comment.authorAvatarUrl }} style={styles.avatarImage as ImageStyle} />
          ) : (
            <Text style={[styles.avatarText, { color: comment.avatarTextColor || roleStyle?.avatarTextColor || "#315efb" }]}>
              {getInitials(comment.author || "Anonymous")}
            </Text>
          )}
        </View>
        <Text style={styles.author}>{comment.author || "Anonymous"}</Text>
        {comment.authorType && (
          <View style={[
            styles.authorBadge,
            {
              backgroundColor: roleStyle?.backgroundColor || "#f2f4f7",
              borderColor: roleStyle?.borderColor || "#e4e7ec",
            },
          ]}>
            {roleStyle?.icon && <Text>{roleStyle.icon}</Text>}
            <Text style={[styles.authorBadgeText, { color: roleStyle?.color || "#475467" }]}>
              {roleStyle?.label || comment.authorType}
            </Text>
          </View>
        )}
        <Text style={styles.timestamp}>{formatDate(comment.createdAt)}</Text>
      </View>

      <View style={[
        styles.card,
        variant === "chat" && (isChatUser ? styles.chatCardUser : styles.chatCardAssistant),
        {
          backgroundColor: comment.cardColor || roleStyle?.cardColor || "#fff",
          borderColor: comment.cardBorderColor || roleStyle?.cardBorderColor || "#e4e7ec",
        },
      ]}>
        {comment.quotedAuthor ? <Text style={styles.replyBannerTitle}>↳ {comment.quotedAuthor}</Text> : null}
        {renderCommentBody ? (
          <View>{renderCommentBody(comment)}</View>
        ) : (
          <Text style={[styles.commentText, { color: comment.cardTextColor || roleStyle?.cardTextColor || "#344054" }]}>
            {comment.text ?? comment.body ?? ""}
          </Text>
        )}
        {showRating && rating != null && (
          <View style={styles.rating}>
            <Text style={styles.ratingText}>
              {"★".repeat(Math.max(0, Math.min(5, Math.round(rating))))}
              {"☆".repeat(5 - Math.max(0, Math.min(5, Math.round(rating))))}
            </Text>
            <Text style={styles.ratingValue}>{rating}/5</Text>
          </View>
        )}
        {!!comment.attachments?.length && (
          <View style={styles.attachments}>
            {comment.attachments.map((attachment, index) => {
              const file = typeof attachment === "string"
                ? { name: `Attachment ${index + 1}`, url: attachment, mimeType: "" }
                : attachment;
              const uri = file.url || file.dataUrl;
              const isImage = Boolean(file.mimeType?.startsWith("image/")) || hasImageExtension(uri || "");
              return (
                <Pressable
                  accessibilityRole="link"
                  key={`${file.name}-${index}`}
                  style={styles.attachment}
                  onPress={() => uri && void Linking.openURL(uri)}
                >
                  {isImage && uri ? <Image source={{ uri }} style={styles.attachmentImage as ImageStyle} resizeMode="cover" /> : null}
                  <Text style={styles.attachmentText}>📎 {file.name || `Attachment ${index + 1}`}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {(allowReplies || allowReactions) && (
          <View style={styles.actionRow}>
            {allowReactions && REACTION_EMOJIS.map((emoji) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selected.includes(emoji) }}
                key={emoji}
                style={[styles.action, selected.includes(emoji) && styles.actionSelected]}
                onPress={() => onReact(comment, emoji)}
              >
                <Text>{emoji}</Text>
                {(reactions[emoji] || 0) > 0 ? <Text style={styles.actionText}>{reactions[emoji]}</Text> : null}
              </Pressable>
            ))}
            {allowReplies && (
              <Pressable style={styles.replyAction} onPress={() => onReply(comment)}>
                <Text style={styles.replyActionText}>Reply</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {!!comment.replies?.length && (
        <View style={styles.replies}>
          {comment.replies.map((reply) => (
            <NativeCommentCard
              key={reply.id}
              comment={reply}
              authorTypeStyles={authorTypeStyles}
              depth={depth + 1}
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
        </View>
      )}
    </View>
  );
};

export default NativeCommentCard;
