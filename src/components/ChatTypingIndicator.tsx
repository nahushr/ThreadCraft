import type { JSX } from "react";
import styles from "./ChatTypingIndicator.module.scss";

interface ChatTypingIndicatorProps {
  label?: string;
}

const ChatTypingIndicator = ({ label = "AI assistant is thinking" }: ChatTypingIndicatorProps): JSX.Element => (
  <div aria-label={label} className={styles.indicator} role="status">
    <span aria-hidden="true" className={styles.dots}><i /><i /><i /></span>
    <span>{label}</span>
  </div>
);

export default ChatTypingIndicator;
