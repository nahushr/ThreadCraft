import type { JSX } from "react";
import type { ThreadCraftAttachmentInput } from "../types";
import styles from "./CommentAttachments.module.scss";

interface CommentAttachmentsProps {
  attachments?: ThreadCraftAttachmentInput[];
}

const getAttachment = (attachment: ThreadCraftAttachmentInput, index: number) => {
  if (typeof attachment === "string") {
    return {
      name: `Attachment ${index + 1}`,
      url: attachment,
      isImage: /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(attachment),
    };
  }
  return {
    name: attachment.name || `Attachment ${index + 1}`,
    url: attachment.url || attachment.dataUrl,
    isImage: Boolean(attachment.mimeType?.startsWith("image/")) || Boolean(attachment.dataUrl),
  };
};

const CommentAttachments = ({ attachments = [] }: CommentAttachmentsProps): JSX.Element | null => {
  if (!attachments.length) return null;

  return (
    <div className={styles.attachments} aria-label="Attachments">
      {attachments.map((attachment, index) => {
        const file = getAttachment(attachment, index);
        return file.url ? (
          <a
            className={styles.attachment}
            href={file.url}
            key={`${file.name}-${index}`}
            target="_blank"
            rel="noreferrer"
          >
            {file.isImage && <img src={file.url} alt="" loading="lazy" />}
            <span className={styles.name}>
              <span aria-hidden="true">📎</span>
              {file.name}
            </span>
          </a>
        ) : (
          <span className={styles.attachment} key={`${file.name}-${index}`}>
            <span aria-hidden="true">📎</span>
            {file.name}
          </span>
        );
      })}
    </div>
  );
};

export default CommentAttachments;
