import type { JSX } from "react";
import type { ThreadCraftData, ThreadCraftVariant } from "../types";
import { formatDate } from "../utils/formatDate";
import styles from "./DiscussionHeader.module.scss";

interface DiscussionHeaderProps {
  data: ThreadCraftData;
  variant: ThreadCraftVariant;
}

const DiscussionHeader = ({ data, variant }: DiscussionHeaderProps): JSX.Element => {
  const statusValue = data.status?.toLowerCase();
  const statusClass = statusValue === "open"
    ? styles.statusOpen
    : statusValue === "closed"
      ? styles.statusClosed
      : "";

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <div className={styles.eyebrow}>
          {variant === "review"
            ? "CUSTOMER REVIEWS"
            : variant === "chat"
              ? "AI CHAT"
              : `GITHUB ISSUE${data.id != null ? ` #${data.id}` : ""}`}
        </div>
        <h2 className={styles.title}>
          {data.title || (variant === "review" ? "Customer reviews" : variant === "chat" ? "AI chat" : "Discussion")}
        </h2>
        {data.body && <p className={styles.body}>{data.body}</p>}
        <div className={styles.details}>
          {data.author && (
            <span>
              {variant === "review" ? "Store" : variant === "chat" ? "Assistant" : "Opened by"} <strong>{data.author}</strong>
            </span>
          )}
          {data.createdAt && <time>{formatDate(data.createdAt)}</time>}
          {data.status && (
            <span className={`${styles.status} ${statusClass}`.trim()}>{data.status}</span>
          )}
        </div>
      </div>
      {data.url && (
        <a className={styles.externalLink} href={data.url} target="_blank" rel="noreferrer">
          {variant === "chat" ? "Open chat" : "View on GitHub"} <span aria-hidden="true">↗</span>
        </a>
      )}
    </header>
  );
};

export default DiscussionHeader;
