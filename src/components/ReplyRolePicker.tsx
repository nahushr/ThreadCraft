import type { JSX } from "react";
import type { ThreadCraftReplyAuthorType } from "../types";
import styles from "./ReplyRolePicker.module.scss";

interface ReplyRolePickerProps {
  variant: "issue" | "review";
  value: ThreadCraftReplyAuthorType;
  options?: ThreadCraftReplyAuthorType[];
  disabled?: boolean;
  onChange: (role: ThreadCraftReplyAuthorType) => void;
}

const getDefaultRoleOptions = (variant: "issue" | "review"): ThreadCraftReplyAuthorType[] => {
  if (variant === "review") return ["customer", "business"];
  return ["support", "customer"];
};

const ReplyRolePicker = ({
  variant,
  value,
  options,
  disabled = false,
  onChange,
}: ReplyRolePickerProps): JSX.Element => {
  const roleOptions: ThreadCraftReplyAuthorType[] = options?.length ? options : getDefaultRoleOptions(variant);
  const label = (role: ThreadCraftReplyAuthorType): string =>
    role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <label className={styles.picker}>
      <span className={styles.label}>Replying as</span>
      {roleOptions.length > 1 ? (
        <span className={styles.selectWrap}>
          <select
            aria-label="Replying as"
            className={styles.select}
            disabled={disabled}
            value={value}
            onChange={(event) => onChange(event.target.value as ThreadCraftReplyAuthorType)}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>{label(role)}</option>
            ))}
          </select>
        </span>
      ) : (
        <span className={styles.fixedRole}>{label(roleOptions[0] ?? value)}</span>
      )}
    </label>
  );
};

export default ReplyRolePicker;
