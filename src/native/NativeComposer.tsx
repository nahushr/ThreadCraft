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

const getIdentityError = (
  identityFields: ThreadCraftIdentityFields | undefined,
  authorName: string,
  authorEmail: string,
): string => {
  if (identityFields?.authorName?.required && !authorName.trim()) return "Enter your name before posting.";
  if (identityFields?.authorEmail?.required && !authorEmail.trim()) return "Enter your email before posting.";
  if (authorEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail.trim())) {
    return "Enter a valid email address.";
  }
  return "";
};

const getComposerLabel = (
  override: string | undefined,
  variant: ThreadCraftVariant,
  replyingTo: ThreadCraftComment | null,
  showRating: boolean,
): string => {
  if (override) return override;
  if (variant === "chat") return "Send a message";
  if (replyingTo) return "Write a reply";
  if (showRating) return "Write a review";
  return "Add a comment";
};

const getInputPlaceholder = (
  override: string | undefined,
  variant: ThreadCraftVariant,
  replyingTo: ThreadCraftComment | null,
  showRating: boolean,
): string => {
  if (override) return override;
  if (replyingTo) return `Reply to ${replyingTo.author}…`;
  if (showRating) return "Share your review…";
  if (variant === "chat") return "Message the assistant…";
  return "Write a comment…";
};

const getSubmitLabel = (
  override: string | undefined,
  submittingLabel: string | undefined,
  isSubmitting: boolean,
  sending: boolean,
  variant: ThreadCraftVariant,
  replyingTo: ThreadCraftComment | null,
): string => {
  if (sending || isSubmitting) {
    if (submittingLabel) return submittingLabel;
    return variant === "chat" ? "Thinking…" : "Posting…";
  }
  if (override) return override;
  if (replyingTo) return "Reply";
  if (variant === "review") return "Post review";
  return "Send";
};

const IMAGE_EXTENSIONS = new Set(["avif", "gif", "jpeg", "jpg", "png", "webp"]);

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

const NativeReplyBanner = ({
  comment,
  onCancel,
}: {
  comment: ThreadCraftComment;
  onCancel: () => void;
}): JSX.Element => (
  <View style={styles.replyBanner}>
    <View style={styles.replyBannerCopy}>
      <Text style={styles.replyBannerTitle}>↳ Replying to {comment.author}</Text>
      <Text numberOfLines={2} style={styles.replyBannerText}>{comment.text || comment.body || ""}</Text>
    </View>
    <Pressable accessibilityRole="button" onPress={onCancel}>
      <Text style={styles.replyActionText}>×</Text>
    </Pressable>
  </View>
);

const NativeRatingPicker = ({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (value: number) => void;
}): JSX.Element => (
  <View>
    <Text style={styles.fieldLabel}>Your rating</Text>
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} style={styles.starButton} onPress={() => onChange(star)}>
          <Text style={styles.starText}>{star <= rating ? "★" : "☆"}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

const NativeAttachmentList = ({
  attachments,
  onRemove,
}: {
  attachments: ThreadCraftAttachment[];
  onRemove: (index: number) => void;
}): JSX.Element | null => {
  if (!attachments.length) return null;
  return (
    <View style={styles.selectedFiles}>
      {attachments.map((attachment, index) => (
        <View key={`${attachment.name}-${index}`} style={styles.fileChip}>
          <Text numberOfLines={1} style={styles.fileChipText}>📎 {attachment.name}</Text>
          <Pressable accessibilityRole="button" onPress={() => onRemove(index)}>
            <Text style={styles.fileRemove}>×</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
};

const NativeReplyRoleControl = ({
  replyAuthorTypes,
  replyAuthorType,
  roleMenuOpen,
  onToggle,
  onChange,
}: {
  replyAuthorTypes: ThreadCraftReplyAuthorType[];
  replyAuthorType: ThreadCraftReplyAuthorType;
  roleMenuOpen: boolean;
  onToggle: () => void;
  onChange: (role: ThreadCraftReplyAuthorType) => void;
}): JSX.Element => {
  if (replyAuthorTypes.length < 2) {
    return <Text style={styles.toolButtonText}>Replying as {replyAuthorType}</Text>;
  }
  return (
    <View style={styles.roleWrap}>
      <Pressable accessibilityRole="button" style={styles.toolButton} onPress={onToggle}>
        <Text style={styles.toolButtonText}>Replying as {replyAuthorType}</Text>
        <Text style={styles.toolButtonText}>⌄</Text>
      </Pressable>
      {roleMenuOpen && (
        <View style={styles.roleMenu}>
          {replyAuthorTypes.map((role) => (
            <Pressable
              key={role}
              style={[styles.roleOption, replyAuthorType === role && styles.roleOptionSelected]}
              onPress={() => onChange(role)}
            >
              <Text style={styles.roleOptionText}>{role[0].toUpperCase() + role.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const isImageAttachment = (attachment: ThreadCraftAttachment): boolean => {
  if (attachment.mimeType?.startsWith("image/")) return true;
  const extension = attachment.name.split(".").at(-1)?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
};

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
    const identityError = getIdentityError(identityFields, authorName, authorEmail);
    if (identityError) {
      setError(identityError);
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

  const composerLabelText = getComposerLabel(composerLabel, variant, replyingTo, showRating);
  const placeholder = getInputPlaceholder(inputPlaceholder, variant, replyingTo, showRating);
  const sendLabel = getSubmitLabel(
    submitButtonLabel,
    submittingLabel,
    isSubmitting,
    sending,
    variant,
    replyingTo,
  );
  const sendDisabled = sending || isSubmitting || !draft.trim();
  const handleReplyAuthorChange = (role: ThreadCraftReplyAuthorType): void => {
    setReplyAuthorType(role);
    setRoleMenuOpen(false);
  };

  return (
    <View style={styles.composer}>
      {replyingTo && <NativeReplyBanner comment={replyingTo} onCancel={onCancelReply} />}

      {allowRatingInput && !replyingTo && (
        <NativeRatingPicker rating={rating} onChange={setRating} />
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
        accessibilityLabel={composerLabelText}
        placeholder={placeholder}
        editable={!sending && !isSubmitting}
        placeholderTextColor="#98a2b3"
        style={[styles.input, styles.textarea]}
        value={draft}
        onChangeText={setDraft}
      />

      <NativeAttachmentList
        attachments={attachments}
        onRemove={(index) => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
      />

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
        {replyingTo && (
          <NativeReplyRoleControl
            replyAuthorTypes={replyAuthorTypes}
            replyAuthorType={replyAuthorType}
            roleMenuOpen={roleMenuOpen}
            onToggle={() => setRoleMenuOpen((open) => !open)}
            onChange={handleReplyAuthorChange}
          />
        )}
        <View style={styles.flexSpacer} />
        <Pressable
          accessibilityRole="button"
          disabled={sendDisabled}
          style={[styles.sendButton, sendDisabled && styles.sendDisabled]}
          onPress={() => void handleSubmit()}
        >
          <Text style={styles.sendText}>{sendLabel}</Text>
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
