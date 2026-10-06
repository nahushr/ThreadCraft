import type { JSX } from "react";
import styles from "./ChatTypingIndicator.module.scss";

interface ChatTypingIndicatorProps {
  label?: string;
}

const ChatTypingIndicator = ({ label = "AI assistant is thinking" }: ChatTypingIndicatorProps): JSX.Element => (
  <output aria-label={label} className={styles.indicator}>
    <span aria-hidden="true" className={styles.dots}><i /><i /><i /></span>
    <span>{label}</span>
  </output>
);

export default ChatTypingIndicator;
