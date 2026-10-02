import { useRef, useState } from "react";
import type { ChangeEvent, JSX } from "react";
import type { ThreadCraftAttachment } from "../types";
import styles from "./AttachmentPicker.module.scss";

const MAX_ATTACHMENTS = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface AttachmentPickerProps {
  attachments: ThreadCraftAttachment[];
  onChange: (attachments: ThreadCraftAttachment[]) => void;
  disabled?: boolean;
}

const readFile = (file: File): Promise<ThreadCraftAttachment> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      mimeType: file.type,
      size: file.size,
      dataUrl: typeof reader.result === "string" ? reader.result : undefined,
    });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });

const AttachmentPicker = ({
  attachments,
  onChange,
  disabled = false,
}: AttachmentPickerProps): JSX.Element => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setError("");
    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setError(`Attach up to ${MAX_ATTACHMENTS} images per comment.`);
      return;
    }
    const invalid = files.find(
      (file) => !file.type.startsWith("image/") || file.size > MAX_FILE_BYTES,
    );
    if (invalid) {
      setError(`${invalid.name} must be an image no larger than 5 MB.`);
      return;
    }
    try {
      onChange([...attachments, ...await Promise.all(files.map(readFile))]);
    } catch {
      setError("One or more images could not be read.");
    }
  };

  const remove = (index: number): void => {
    onChange(attachments.filter((_, attachmentIndex) => attachmentIndex !== index));
    setError("");
  };

  return (
    <div className={styles.root}>
      <input
        ref={inputRef}
        accept="image/*"
        className={styles.fileInput}
        disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
        multiple
        type="file"
        onChange={(event) => void handleFiles(event)}
      />
      <button
        aria-label="Attach images"
        className={styles.attachButton}
        disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        <span aria-hidden="true" className={styles.attachIcon}>📎</span>
        <span>Attach</span>
        {attachments.length > 0 && <span className={styles.count}>{attachments.length}</span>}
      </button>
      {!!attachments.length && (
        <div className={styles.pending}>
          {attachments.map((attachment, index) => (
            <span className={styles.fileChip} key={`${attachment.name}-${index}`}>
              {attachment.dataUrl && (
                <img alt="" className={styles.thumbnail} src={attachment.dataUrl} />
              )}
              <span className={styles.fileName}>{attachment.name}</span>
              <button
                aria-label={`Remove ${attachment.name}`}
                type="button"
                onClick={() => remove(index)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
};

export default AttachmentPicker;
