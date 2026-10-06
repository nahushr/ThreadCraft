import { useEffect, useState } from "react";
import type { JSX } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type {
  ThreadCraftAttachment,
  ThreadCraftComment,
  ThreadCraftIdentityField,
  ThreadCraftIdentityFields,
  ThreadCraftReplyAuthorType,
  ThreadCraftSubmitPayload,
  ThreadCraftVariant,
} from "../types";
import { nativeStyles as styles } from "./styles";
import NativeEmojiPicker from "./NativeEmojiPicker";

interface NativeComposerProps {
  variant: ThreadCraftVariant;
  replyingTo: ThreadCraftComment | null;
  showRating: boolean;
  allowRatingInput: boolean;
  allowAttachments: boolean;
  allowEmoji: boolean;
  inputPlaceholder?: string;
  composerLabel?: string;
  submitButtonLabel?: string;
  submittingLabel?: string;
  isSubmitting?: boolean;
  replyAuthorTypes: ThreadCraftReplyAuthorType[];
  newCommentAuthorType: ThreadCraftReplyAuthorType;
  identityFields?: ThreadCraftIdentityFields;
  onPickAttachments?: () => Promise<ThreadCraftAttachment[]>;
  onCancelReply: () => void;
  onSubmit: (payload: ThreadCraftSubmitPayload) => Promise<void>;
}

const getDefaultReplyAuthorType = (
  variant: ThreadCraftVariant,
  options: ThreadCraftReplyAuthorType[],
): ThreadCraftReplyAuthorType => {
  const preferred = variant === "review" ? "business" : "support";
  return options.includes(preferred) ? preferred : options[0] || preferred;
};

const IdentityInput = ({
  field,
  value,
  onChange,
}: {
  field: ThreadCraftIdentityField;
  value: string;
  onChange: (value: string) => void;
}): JSX.Element => (
  <View style={styles.identityField}>
    <Text style={styles.fieldLabel}>{field.label}{field.required ? " *" : ""}</Text>
    <TextInput
      autoCapitalize={field.keyboardType === "email-address" ? "none" : "words"}
      autoComplete={field.keyboardType === "email-address" ? "email" : "name"}
      keyboardType={field.keyboardType === "email-address" ? "email-address" : "default"}
      placeholder={field.placeholder}
      placeholderTextColor="#98a2b3"
      style={styles.input}
      value={value}
      onChangeText={onChange}
    />
  </View>
);

const isImageAttachment = (attachment: ThreadCraftAttachment): boolean =>
  Boolean(attachment.mimeType?.startsWith("image/")) || /\.(?:avif|gif|jpe?g|png|webp)$/i.test(attachment.name);

const NativeComposer = ({
  variant,
  replyingTo,
  showRating,
  allowRatingInput,
  allowAttachments,
  allowEmoji,
  inputPlaceholder,
  composerLabel,
  submitButtonLabel,
  submittingLabel,
  isSubmitting = false,
  replyAuthorTypes,
  newCommentAuthorType,
  identityFields,
  onPickAttachments,
  onCancelReply,
  onSubmit,
}: NativeComposerProps): JSX.Element => {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<ThreadCraftAttachment[]>([]);
  const [rating, setRating] = useState(5);
  const [authorName, setAuthorName] = useState(identityFields?.authorName?.value || "");
  const [authorEmail, setAuthorEmail] = useState(identityFields?.authorEmail?.value || "");
  const [replyAuthorType, setReplyAuthorType] = useState<ThreadCraftReplyAuthorType>(
    () => getDefaultReplyAuthorType(variant, replyAuthorTypes),
  );
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const roleOptionsKey = replyAuthorTypes.join(",");

  useEffect(() => setAuthorName(identityFields?.authorName?.value || ""), [identityFields?.authorName?.value]);
  useEffect(() => setAuthorEmail(identityFields?.authorEmail?.value || ""), [identityFields?.authorEmail?.value]);
  useEffect(() => {
    const options = roleOptionsKey.split(",").filter(Boolean) as ThreadCraftReplyAuthorType[];
    setReplyAuthorType(getDefaultReplyAuthorType(variant, options));
  }, [roleOptionsKey, variant]);

  const handlePickAttachments = async (): Promise<void> => {
    if (!onPickAttachments || sending) {
      setError("Connect a file picker to attach files in this app.");
      return;
    }
    try {
      const selected = await onPickAttachments();
      const valid = selected.filter((file) => isImageAttachment(file) && (file.size ?? 0) <= 5 * 1024 * 1024);
      setAttachments((current) => [...current, ...valid].slice(0, 10));
      setError(valid.length < selected.length ? "Only images up to 5 MB can be attached; limit 10 files." : "");
    } catch {
      setError("Could not add the selected file. Please try again.");
    }
  };

  const handleSubmit = async (): Promise<void> => {
    const text = draft.trim();
    if (!text || sending || isSubmitting) return;
    if (identityFields?.authorName?.required && !authorName.trim()) {
      setError("Enter your name before posting.");
      return;
    }
    if (identityFields?.authorEmail?.required && !authorEmail.trim()) {
      setError("Enter your email before posting.");
      return;
    }
    if (authorEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setSending(true);
    setError("");
    try {
      await onSubmit({
        text,
        parentId: replyingTo?.id,
        attachments,
        rating: allowRatingInput && !replyingTo ? rating : undefined,
        authorName: authorName.trim() || undefined,
        authorEmail: authorEmail.trim() || undefined,
        authorType: replyingTo ? replyAuthorType : newCommentAuthorType,
      });
      setDraft("");
      setAttachments([]);
      setRating(5);
    } catch {
      setError("Could not post your comment. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.composer}>
      {replyingTo && (
        <View style={styles.replyBanner}>
          <View style={styles.replyBannerCopy}>
            <Text style={styles.replyBannerTitle}>↳ Replying to {replyingTo.author}</Text>
            <Text numberOfLines={2} style={styles.replyBannerText}>{replyingTo.text || replyingTo.body || ""}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onCancelReply}>
            <Text style={styles.replyActionText}>×</Text>
          </Pressable>
        </View>
      )}

      {allowRatingInput && !replyingTo && (
        <View>
          <Text style={styles.fieldLabel}>Your rating</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} style={styles.starButton} onPress={() => setRating(star)}>
                <Text style={styles.starText}>{star <= rating ? "★" : "☆"}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {identityFields?.authorName && (
        <IdentityInput field={identityFields.authorName} value={authorName} onChange={setAuthorName} />
      )}
      {identityFields?.authorEmail && (
        <IdentityInput field={identityFields.authorEmail} value={authorEmail} onChange={setAuthorEmail} />
      )}

      <TextInput
        multiline
        numberOfLines={3}
        accessibilityLabel={composerLabel || (variant === "chat" ? "Send a message" : replyingTo ? "Write a reply" : showRating ? "Write a review" : "Add a comment")}
        placeholder={inputPlaceholder || (replyingTo ? `Reply to ${replyingTo.author}…` : showRating ? "Share your review…" : variant === "chat" ? "Message the assistant…" : "Write a comment…")}
        editable={!sending && !isSubmitting}
        placeholderTextColor="#98a2b3"
        style={[styles.input, styles.textarea]}
        value={draft}
        onChangeText={setDraft}
      />

      {!!attachments.length && (
        <View style={styles.selectedFiles}>
          {attachments.map((attachment, index) => (
            <View key={`${attachment.name}-${index}`} style={styles.fileChip}>
              <Text numberOfLines={1} style={styles.fileChipText}>📎 {attachment.name}</Text>
              <Pressable accessibilityRole="button" onPress={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                <Text style={styles.fileRemove}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={styles.toolRow}>
        {allowAttachments && (
          <Pressable accessibilityRole="button" style={styles.toolButton} onPress={() => void handlePickAttachments()}>
            <Text>📎</Text><Text style={styles.toolButtonText}>Attach</Text>
          </Pressable>
        )}
        {allowEmoji && (
          <Pressable accessibilityRole="button" style={styles.toolButton} onPress={() => setEmojiOpen(true)}>
            <Text>😀</Text><Text style={styles.toolButtonText}>Emoji</Text>
          </Pressable>
        )}
        {replyingTo && replyAuthorTypes.length > 1 ? (
          <View style={styles.roleWrap}>
            <Pressable accessibilityRole="button" style={styles.toolButton} onPress={() => setRoleMenuOpen((open) => !open)}>
              <Text style={styles.toolButtonText}>Replying as {replyAuthorType}</Text>
              <Text style={styles.toolButtonText}>⌄</Text>
            </Pressable>
            {roleMenuOpen && (
              <View style={styles.roleMenu}>
                {replyAuthorTypes.map((role) => (
                  <Pressable
                    key={role}
                    style={[styles.roleOption, replyAuthorType === role && styles.roleOptionSelected]}
                    onPress={() => { setReplyAuthorType(role); setRoleMenuOpen(false); }}
                  >
                    <Text style={styles.roleOptionText}>{role[0].toUpperCase() + role.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : replyingTo ? (
          <Text style={styles.toolButtonText}>Replying as {replyAuthorType}</Text>
        ) : null}
        <View style={styles.flexSpacer} />
        <Pressable
          accessibilityRole="button"
          disabled={sending || isSubmitting || !draft.trim()}
          style={[styles.sendButton, (sending || isSubmitting || !draft.trim()) && styles.sendDisabled]}
          onPress={() => void handleSubmit()}
        >
          <Text style={styles.sendText}>{sending || isSubmitting ? submittingLabel || (variant === "chat" ? "Thinking…" : "Posting…") : submitButtonLabel || (replyingTo ? "Reply" : variant === "review" ? "Post review" : "Send")}</Text>
        </Pressable>
      </View>

      <NativeEmojiPicker
        visible={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onSelect={(emoji) => { setDraft((current) => `${current}${emoji}`); setEmojiOpen(false); }}
      />
    </View>
  );
};

export default NativeComposer;
