import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, JSX } from "react";
import type {
  ThreadCraftAttachment,
  ThreadCraftComment,
  ThreadCraftIdentityFields,
  ThreadCraftReplyAuthorType,
  ThreadCraftSubmitPayload,
  ThreadCraftVariant,
} from "../types";
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || isSubmitting) return;

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

  const label = composerLabel || (replyingTo
    ? "Write a reply"
    : showRating
      ? "Write a review"
      : variant === "chat"
        ? "Send a message"
        : "Add a comment");

  return (
    <form className={`${styles.composer} ${variant === "chat" ? styles.chatComposer : ""}`.trim()} onSubmit={(event) => void handleSubmit(event)}>
      {replyingTo && (
        <div className={styles.replyBanner}>
          <span className={styles.quoteIcon} aria-hidden="true">↳</span>
          <div className={styles.replyCopy}>
            <strong>Replying to {replyingTo.author}</strong>
            <span>{(replyingTo.text ?? replyingTo.body ?? "").slice(0, 140)}</span>
          </div>
          <button
            aria-label="Cancel reply"
            className={styles.cancelReply}
            type="button"
            onClick={onCancelReply}
          >
            ×
          </button>
        </div>
      )}

      {allowRatingInput && !replyingTo && <RatingPicker value={rating} onChange={setRating} />}

      {identityFields?.authorName && (
        <label className={styles.identityField} htmlFor={nameId}>
          <span>{identityFields.authorName.label}</span>
          <input
            autoComplete="name"
            disabled={sending || isSubmitting}
            id={nameId}
            placeholder={identityFields.authorName.placeholder}
            required={identityFields.authorName.required}
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
          />
        </label>
      )}

      {identityFields?.authorEmail && (
        <label className={styles.identityField} htmlFor={emailId}>
          <span>{identityFields.authorEmail.label}</span>
          <input
            autoComplete="email"
            disabled={sending || isSubmitting}
            id={emailId}
            placeholder={identityFields.authorEmail.placeholder}
            required={identityFields.authorEmail.required}
            type="email"
            value={authorEmail}
            onChange={(event) => setAuthorEmail(event.target.value)}
          />
        </label>
      )}

      <label className={styles.screenReaderOnly} htmlFor={inputId}>{label}</label>
      <textarea
        className={styles.input}
        disabled={sending || isSubmitting}
        id={inputId}
        placeholder={inputPlaceholder ?? (replyingTo
          ? `Reply to ${replyingTo.author}…`
          : showRating
            ? "Share your review…"
            : variant === "chat"
              ? "Message the assistant…"
              : "Write a comment…")}
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
        <div className={styles.tools}>
          {allowAttachments && (
            <AttachmentPicker
              attachments={attachments}
              disabled={sending || isSubmitting}
              onChange={setAttachments}
            />
          )}
          {allowEmoji && <EmojiPicker disabled={sending || isSubmitting} onSelect={insertEmoji} />}
          {replyingTo && (
            <ReplyRolePicker
              disabled={sending || isSubmitting}
              value={replyAuthorType}
              variant={variant === "review" ? "review" : "issue"}
              onChange={setReplyAuthorType}
            />
          )}
        </div>
        <button className={styles.sendButton} disabled={sending || isSubmitting || !draft.trim()} type="submit">
          {sending || isSubmitting
            ? submittingLabel ?? (variant === "chat" ? "Thinking…" : "Posting…")
            : submitButtonLabel ?? (replyingTo ? "Reply" : variant === "review" ? "Post review" : "Send")}
        </button>
      </div>
    </form>
  );
};

export default CommentComposer;
