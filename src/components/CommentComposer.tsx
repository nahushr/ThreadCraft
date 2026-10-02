import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, JSX } from "react";
import type {
  ThreadCraftAttachment,
  ThreadCraftComment,
  ThreadCraftReplyAuthorType,
  ThreadCraftSubmitPayload,
} from "../types";
import AttachmentPicker from "./AttachmentPicker";
import EmojiPicker from "./EmojiPicker";
import RatingPicker from "./RatingPicker";
import ReplyRolePicker from "./ReplyRolePicker";
import styles from "./CommentComposer.module.scss";

interface CommentComposerProps {
  variant: "issue" | "review";
  showRating: boolean;
  allowAttachments: boolean;
  replyingTo: ThreadCraftComment | null;
  onCancelReply: () => void;
  onSubmit: (payload: ThreadCraftSubmitPayload) => Promise<void>;
}

const CommentComposer = ({
  variant,
  showRating,
  allowAttachments,
  replyingTo,
  onCancelReply,
  onSubmit,
}: CommentComposerProps): JSX.Element => {
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<ThreadCraftAttachment[]>([]);
  const [rating, setRating] = useState(5);
  const [replyAuthorType, setReplyAuthorType] = useState<ThreadCraftReplyAuthorType>(
    variant === "review" ? "business" : "support",
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  useEffect(() => {
    setReplyAuthorType(variant === "review" ? "business" : "support");
  }, [variant]);

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
        rating: showRating && !replyingTo ? rating : undefined,
        authorType: replyingTo ? replyAuthorType : undefined,
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

      {showRating && !replyingTo && <RatingPicker value={rating} onChange={setRating} />}

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
