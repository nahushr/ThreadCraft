import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, JSX } from "react";
import type {
  ThreadCraftAttachment,
  ThreadCraftComment,
  ThreadCraftIdentityFields,
  ThreadCraftReplyAuthorType,
  ThreadCraftSubmitPayload,
} from "../types";
import AttachmentPicker from "./AttachmentPicker";
import EmojiPicker from "./EmojiPicker";
import RatingPicker from "./RatingPicker";
import ReplyRolePicker from "./ReplyRolePicker";
import styles from "./CommentComposer.module.scss";

const getDefaultReplyAuthorType = (
  variant: "issue" | "review",
  options?: ThreadCraftReplyAuthorType[],
): ThreadCraftReplyAuthorType => {
  const preferred = variant === "review" ? "business" : "support";
  return options?.includes(preferred) ? preferred : options?.[0] ?? preferred;
};

interface CommentComposerProps {
  variant: "issue" | "review";
  showRating: boolean;
  allowRatingInput: boolean;
  allowAttachments: boolean;
  replyAuthorTypes?: ThreadCraftReplyAuthorType[];
  newCommentAuthorType: ThreadCraftReplyAuthorType;
  identityFields?: ThreadCraftIdentityFields;
  replyingTo: ThreadCraftComment | null;
  onCancelReply: () => void;
  onSubmit: (payload: ThreadCraftSubmitPayload) => Promise<void>;
}

const CommentComposer = ({
  variant,
  showRating,
  allowRatingInput,
  allowAttachments,
  replyAuthorTypes,
  newCommentAuthorType,
  identityFields,
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
    if (!text || sending) return;

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

  const label = replyingTo
    ? "Write a reply"
    : showRating
      ? "Write a review"
      : "Add a comment";

  return (
    <form className={styles.composer} onSubmit={(event) => void handleSubmit(event)}>
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
            disabled={sending}
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
            disabled={sending}
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
        disabled={sending}
        id={inputId}
        placeholder={replyingTo ? `Reply to ${replyingTo.author}…` : showRating ? "Share your review…" : "Write a comment…"}
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
              disabled={sending}
              onChange={setAttachments}
            />
          )}
          <EmojiPicker disabled={sending} onSelect={insertEmoji} />
          {replyingTo && (
            <ReplyRolePicker
              disabled={sending}
              value={replyAuthorType}
              variant={variant}
              onChange={setReplyAuthorType}
            />
          )}
        </div>
        <button className={styles.sendButton} disabled={sending || !draft.trim()} type="submit">
          {sending ? "Posting…" : replyingTo ? "Reply" : variant === "review" ? "Post review" : "Send"}
        </button>
      </div>
    </form>
  );
};

export default CommentComposer;
