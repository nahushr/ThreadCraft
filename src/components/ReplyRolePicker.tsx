import type { JSX } from "react";
import type { ThreadCraftReplyAuthorType } from "../types";
import styles from "./ReplyRolePicker.module.scss";

interface ReplyRolePickerProps {
  variant: "issue" | "review";
  value: ThreadCraftReplyAuthorType;
  disabled?: boolean;
  onChange: (role: ThreadCraftReplyAuthorType) => void;
}

const ReplyRolePicker = ({
  variant,
  value,
  disabled = false,
  onChange,
}: ReplyRolePickerProps): JSX.Element => {
  const options: Array<{ value: ThreadCraftReplyAuthorType; label: string }> = variant === "review"
    ? [
      { value: "customer", label: "Customer" },
      { value: "business", label: "Business" },
    ]
    : [
      { value: "support", label: "Support" },
      { value: "customer", label: "Customer" },
    ];

  return (
    <label className={styles.picker}>
      <span className={styles.label}>Replying as</span>
      <span className={styles.selectWrap}>
        <select
          aria-label="Replying as"
          className={styles.select}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value as ThreadCraftReplyAuthorType)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </span>
    </label>
  );
};

export default ReplyRolePicker;
