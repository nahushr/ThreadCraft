import type { JSX } from "react";
import type { ThreadCraftAttachmentInput } from "../types";
import styles from "./CommentAttachments.module.scss";

const IMAGE_EXTENSIONS = new Set(["avif", "gif", "jpeg", "jpg", "png", "webp"]);

const hasImageExtension = (value: string): boolean => {
  const path = value.split(/[?#]/, 1)[0] ?? "";
  const extension = path.split(".").at(-1)?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
};

interface CommentAttachmentsProps {
  attachments?: ThreadCraftAttachmentInput[];
}

const getAttachment = (attachment: ThreadCraftAttachmentInput, index: number) => {
  if (typeof attachment === "string") {
    return {
      name: `Attachment ${index + 1}`,
      url: attachment,
      isImage: hasImageExtension(attachment),
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
