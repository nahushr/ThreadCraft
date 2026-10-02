import type { JSX } from "react";
import styles from "./RatingPicker.module.scss";

interface RatingPickerProps {
  value: number;
  onChange: (value: number) => void;
}

const RatingPicker = ({ value, onChange }: RatingPickerProps): JSX.Element => (
  <fieldset className={styles.picker}>
    <legend>Your rating</legend>
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
          aria-pressed={value === rating}
          className={styles.star}
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
        >
          {rating <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  </fieldset>
);

export default RatingPicker;
