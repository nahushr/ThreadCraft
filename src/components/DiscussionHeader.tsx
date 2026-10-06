import type { JSX } from "react";
import type { ThreadCraftData, ThreadCraftVariant } from "../types";
import { formatDate } from "../utils/formatDate";
import styles from "./DiscussionHeader.module.scss";

interface DiscussionHeaderProps {
  data: ThreadCraftData;
  variant: ThreadCraftVariant;
}

const getEyebrow = (data: ThreadCraftData, variant: ThreadCraftVariant): string => {
  if (variant === "review") return "CUSTOMER REVIEWS";
  if (variant === "chat") return "AI CHAT";
  if (data.id == null) return "GITHUB ISSUE";
  return `GITHUB ISSUE #${data.id}`;
};

const getDefaultTitle = (variant: ThreadCraftVariant): string => {
  if (variant === "review") return "Customer reviews";
  if (variant === "chat") return "AI chat";
  return "Discussion";
};

const getAuthorLabel = (variant: ThreadCraftVariant): string => {
  if (variant === "review") return "Store";
  if (variant === "chat") return "Assistant";
  return "Opened by";
};

const getExternalLinkLabel = (variant: ThreadCraftVariant): string =>
  variant === "chat" ? "Open chat" : "View on GitHub";

const getStatusClassName = (status: string | undefined): string => {
  if (status === "open") return styles.statusOpen;
  if (status === "closed") return styles.statusClosed;
  return "";
};

const DiscussionHeader = ({ data, variant }: DiscussionHeaderProps): JSX.Element => {
  const statusValue = data.status?.toLowerCase();
  const statusClass = getStatusClassName(statusValue);
  const authorLabel = getAuthorLabel(variant);

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <div className={styles.eyebrow}>
          {getEyebrow(data, variant)}
        </div>
        <h2 className={styles.title}>
          {data.title || getDefaultTitle(variant)}
        </h2>
        {data.body && <p className={styles.body}>{data.body}</p>}
        <div className={styles.details}>
          {data.author && (
            <span>
              {authorLabel} <strong>{data.author}</strong>
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
          {getExternalLinkLabel(variant)} <span aria-hidden="true">↗</span>
        </a>
      )}
    </header>
  );
};

export default DiscussionHeader;
