import { useEffect, useId, useRef, useState } from "react";
import type { JSX, SyntheticEvent } from "react";
import type {
  ThreadCraftAttachment,
  ThreadCraftComment,
  ThreadCraftIdentityFields,
  ThreadCraftIdentityField,
  ThreadCraftReplyAuthorType,
  ThreadCraftSubmitPayload,
  ThreadCraftVariant,
} from "../types";
import isValidEmail from "../utils/isValidEmail";
import AttachmentPicker from "./AttachmentPicker";
import EmojiPicker from "./EmojiPicker";
import RatingPicker from "./RatingPicker";
import ReplyRolePicker from "./ReplyRolePicker";
import styles from "./CommentComposer.module.scss";

const getDefaultReplyAuthorType = (
  variant: ThreadCraftVariant,
  options?: ThreadCraftReplyAuthorType[],
): ThreadCraftReplyAuthorType => {
  const preferred = variant === "review" ? "business" : "support";
  return options?.includes(preferred) ? preferred : options?.[0] ?? preferred;
};

const getComposerReplyAuthorTypes = (
  options: ThreadCraftReplyAuthorType[] | undefined,
  variant: ThreadCraftVariant,
): ThreadCraftReplyAuthorType[] => {
  if (options?.length) return options;
  if (variant === "review") return ["customer", "business"];
  return ["support", "customer"];
};

const getComposerLabel = (
  override: string | undefined,
  replyingTo: ThreadCraftComment | null,
  showRating: boolean,
  variant: ThreadCraftVariant,
): string => {
  if (override) return override;
  if (replyingTo) return "Write a reply";
  if (showRating) return "Write a review";
  return variant === "chat" ? "Send a message" : "Add a comment";
};

const getInputPlaceholder = (
  override: string | undefined,
  replyingTo: ThreadCraftComment | null,
  showRating: boolean,
  variant: ThreadCraftVariant,
): string => {
  if (override) return override;
  if (replyingTo) return `Reply to ${replyingTo.author}…`;
  if (showRating) return "Share your review…";
  return variant === "chat" ? "Message the assistant…" : "Write a comment…";
};

const getSubmitLabel = (
  override: string | undefined,
  replyingTo: ThreadCraftComment | null,
  variant: ThreadCraftVariant,
): string => {
  if (override) return override;
  if (replyingTo) return "Reply";
  return variant === "review" ? "Post review" : "Send";
};

const getSubmittingLabel = (override: string | undefined, variant: ThreadCraftVariant): string =>
  override || (variant === "chat" ? "Thinking…" : "Posting…");

const getIdentityError = (
  identityFields: ThreadCraftIdentityFields | undefined,
  authorName: string,
  authorEmail: string,
): string => {
  if (identityFields?.authorName?.required && !authorName.trim()) return "Enter your name before posting.";
  if (identityFields?.authorEmail?.required && !authorEmail.trim()) return "Enter your email before posting.";
  if (authorEmail.trim() && !isValidEmail(authorEmail.trim())) {
    return "Enter a valid email address.";
  }
  return "";
};

const IdentityInput = ({
  field,
  inputId,
  value,
  disabled,
  onChange,
}: {
  field: ThreadCraftIdentityField;
  inputId: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}): JSX.Element => (
  <label className={styles.identityField} htmlFor={inputId}>
    <span>{field.label}</span>
    <input
      autoComplete={field.keyboardType === "email-address" ? "email" : "name"}
      disabled={disabled}
      id={inputId}
      placeholder={field.placeholder}
      required={field.required}
      type={field.keyboardType === "email-address" ? "email" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

const ComposerIdentityFields = ({
  identityFields,
  nameId,
  emailId,
  authorName,
  authorEmail,
  disabled,
  onAuthorNameChange,
  onAuthorEmailChange,
}: {
  identityFields: ThreadCraftIdentityFields | undefined;
  nameId: string;
  emailId: string;
  authorName: string;
  authorEmail: string;
  disabled: boolean;
  onAuthorNameChange: (value: string) => void;
  onAuthorEmailChange: (value: string) => void;
}): JSX.Element | null => {
  if (!identityFields?.authorName && !identityFields?.authorEmail) return null;
  return (
    <>
      {identityFields.authorName && (
        <IdentityInput
          field={identityFields.authorName}
          inputId={nameId}
          value={authorName}
          disabled={disabled}
          onChange={onAuthorNameChange}
        />
      )}
      {identityFields.authorEmail && (
        <IdentityInput
          field={identityFields.authorEmail}
          inputId={emailId}
          value={authorEmail}
          disabled={disabled}
          onChange={onAuthorEmailChange}
        />
      )}
    </>
  );
};

const ReplyBanner = ({
  comment,
  onCancel,
}: {
  comment: ThreadCraftComment | null;
  onCancel: () => void;
}): JSX.Element | null => {
  if (!comment) return null;
  return (
    <div className={styles.replyBanner}>
      <span className={styles.quoteIcon} aria-hidden="true">↳</span>
      <div className={styles.replyCopy}>
        <strong>Replying to {comment.author}</strong>
        <span>{(comment.text ?? comment.body ?? "").slice(0, 140)}</span>
      </div>
      <button aria-label="Cancel reply" className={styles.cancelReply} type="button" onClick={onCancel}>
        ×
      </button>
    </div>
  );
};

const ComposerTools = ({
  allowAttachments,
  allowEmoji,
  replyingTo,
  replyAuthorTypes,
  replyAuthorType,
  variant,
  disabled,
  attachments,
  onAttachmentsChange,
  onEmojiSelect,
  onReplyAuthorTypeChange,
}: {
  allowAttachments: boolean;
  allowEmoji: boolean;
  replyingTo: ThreadCraftComment | null;
  replyAuthorTypes: ThreadCraftReplyAuthorType[];
  replyAuthorType: ThreadCraftReplyAuthorType;
  variant: ThreadCraftVariant;
  disabled: boolean;
  attachments: ThreadCraftAttachment[];
  onAttachmentsChange: (files: ThreadCraftAttachment[]) => void;
  onEmojiSelect: (emoji: string) => void;
  onReplyAuthorTypeChange: (role: ThreadCraftReplyAuthorType) => void;
}): JSX.Element => (
  <div className={styles.tools}>
    {allowAttachments && (
      <AttachmentPicker attachments={attachments} disabled={disabled} onChange={onAttachmentsChange} />
    )}
    {allowEmoji && <EmojiPicker disabled={disabled} onSelect={onEmojiSelect} />}
    {replyingTo && (
      <ReplyRolePicker
        disabled={disabled}
        value={replyAuthorType}
        variant={variant === "review" ? "review" : "issue"}
        options={replyAuthorTypes}
        onChange={onReplyAuthorTypeChange}
      />
    )}
  </div>
);

interface CommentComposerProps {
  variant: ThreadCraftVariant;
  showRating: boolean;
  allowRatingInput: boolean;
  allowAttachments: boolean;
  allowEmoji: boolean;
  replyAuthorTypes?: ThreadCraftReplyAuthorType[];
  newCommentAuthorType: ThreadCraftReplyAuthorType;
  identityFields?: ThreadCraftIdentityFields;
  inputPlaceholder?: string;
  composerLabel?: string;
  submitButtonLabel?: string;
  submittingLabel?: string;
  isSubmitting?: boolean;
  replyingTo: ThreadCraftComment | null;
  onCancelReply: () => void;
  onSubmit: (payload: ThreadCraftSubmitPayload) => Promise<void>;
}

const CommentComposer = ({
  variant,
  showRating,
  allowRatingInput,
  allowAttachments,
  allowEmoji,
  replyAuthorTypes,
  newCommentAuthorType,
  identityFields,
  inputPlaceholder,
  composerLabel,
  submitButtonLabel,
  submittingLabel,
  isSubmitting = false,
  replyingTo,
  onCancelReply,
  onSubmit,
}: CommentComposerProps): JSX.Element => {
  const inputId = useId();
  const nameId = useId();
  const emailId = useId();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<ThreadCraftAttachment[]>([]);
  const [rating, setRating] = useState(5);
  const [replyAuthorType, setReplyAuthorType] = useState<ThreadCraftReplyAuthorType>(
    () => getDefaultReplyAuthorType(variant, replyAuthorTypes),
  );
  const [authorName, setAuthorName] = useState(identityFields?.authorName?.value ?? "");
  const [authorEmail, setAuthorEmail] = useState(identityFields?.authorEmail?.value ?? "");
  const roleOptionsKey = replyAuthorTypes?.join(",") ?? "";
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  useEffect(() => {
    const options = roleOptionsKey.split(",").filter(Boolean) as ThreadCraftReplyAuthorType[];
    setReplyAuthorType(getDefaultReplyAuthorType(variant, options));
  }, [roleOptionsKey, variant]);

  useEffect(() => {
    setAuthorName(identityFields?.authorName?.value ?? "");
  }, [identityFields?.authorName?.value]);

  useEffect(() => {
    setAuthorEmail(identityFields?.authorEmail?.value ?? "");
  }, [identityFields?.authorEmail?.value]);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
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

  const insertEmoji = (emoji: string): void => {
    setDraft((current) => `${current}${emoji}`);
    inputRef.current?.focus();
  };

  const disabled = sending || isSubmitting;
  const label = getComposerLabel(composerLabel, replyingTo, showRating, variant);
  const placeholder = getInputPlaceholder(inputPlaceholder, replyingTo, showRating, variant);
  const submitLabel = sending || isSubmitting
    ? getSubmittingLabel(submittingLabel, variant)
    : getSubmitLabel(submitButtonLabel, replyingTo, variant);
  const resolvedReplyAuthorTypes = getComposerReplyAuthorTypes(replyAuthorTypes, variant);

  return (
    <form className={`${styles.composer} ${variant === "chat" ? styles.chatComposer : ""}`.trim()} onSubmit={(event) => void handleSubmit(event)}>
      <ReplyBanner comment={replyingTo} onCancel={onCancelReply} />
      {allowRatingInput && !replyingTo && <RatingPicker value={rating} onChange={setRating} />}
      <ComposerIdentityFields
        identityFields={identityFields}
        nameId={nameId}
        emailId={emailId}
        authorName={authorName}
        authorEmail={authorEmail}
        disabled={disabled}
        onAuthorNameChange={setAuthorName}
        onAuthorEmailChange={setAuthorEmail}
      />
      <label className={styles.screenReaderOnly} htmlFor={inputId}>{label}</label>
      <textarea
        className={styles.input}
        disabled={disabled}
        id={inputId}
        placeholder={placeholder}
        ref={inputRef}
        rows={3}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />

      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <ComposerTools
          allowAttachments={allowAttachments}
          allowEmoji={allowEmoji}
          replyingTo={replyingTo}
          replyAuthorTypes={resolvedReplyAuthorTypes}
          replyAuthorType={replyAuthorType}
          variant={variant}
          disabled={disabled}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          onEmojiSelect={insertEmoji}
          onReplyAuthorTypeChange={setReplyAuthorType}
        />
        <button className={styles.sendButton} disabled={disabled || !draft.trim()} type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

export default CommentComposer;
