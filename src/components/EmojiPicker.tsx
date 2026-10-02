import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from "react";
import styles from "./EmojiPicker.module.scss";

interface EmojiEntry {
  group: string;
  emoji: string;
  name: string;
  aliases: string[];
  keywords: string[];
}

const CATEGORIES = [
  { name: "Frequently used", icon: "🕘" },
  { name: "Smileys & Emotion", icon: "😀" },
  { name: "People & Body", icon: "👋" },
  { name: "Animals & Nature", icon: "🐻" },
  { name: "Food & Drink", icon: "🍔" },
  { name: "Travel & Places", icon: "🚗" },
  { name: "Activities", icon: "⚽" },
  { name: "Objects", icon: "💡" },
  { name: "Symbols", icon: "❤️" },
  { name: "Flags", icon: "🏳️" },
] as const;

const INITIAL_RECENTS = ["😀", "😂", "❤️", "🎉", "👍", "🤔", "🚀", "✨"];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

const EmojiPicker = ({ onSelect, disabled = false }: EmojiPickerProps): JSX.Element => {
  const menuId = useId();
  const searchId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Frequently used");
  const [recentEmojis, setRecentEmojis] = useState(INITIAL_RECENTS);
  const [catalog, setCatalog] = useState<EmojiEntry[] | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [retryCount, setRetryCount] = useState(0);

  const emojiByValue = useMemo(
    () => new Map((catalog || []).map((item) => [item.emoji, item])),
    [catalog],
  );
  const searchableEmojis = useMemo(() => (catalog || []).map((item) => ({
    item,
    searchText: [item.name, ...item.aliases, ...item.keywords]
      .join(" ")
      .toLocaleLowerCase(),
  })), [catalog]);

  const results = useMemo(() => {
    if (!catalog) return [];
    const terms = query
      .trim()
      .replace(/^:/, "")
      .replace(/:$/, "")
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (terms.length) {
      return searchableEmojis
        .filter(({ item, searchText }) => terms.every((term) => (
          searchText.includes(term) || item.emoji.includes(term)
        )))
        .map(({ item }) => item);
    }

    if (activeCategory === "Frequently used") {
      return recentEmojis
        .map((emoji) => emojiByValue.get(emoji))
        .filter((item): item is EmojiEntry => Boolean(item));
    }

    return catalog.filter((item) => item.group === activeCategory);
  }, [activeCategory, catalog, emojiByValue, query, recentEmojis, searchableEmojis]);

  useEffect(() => {
    if (!open || catalog) return undefined;
    let active = true;
    setCatalogStatus("loading");
    void import("../data/emojis.json")
      .then((module) => {
        if (!active) return;
        setCatalog(module.default as EmojiEntry[]);
        setCatalogStatus("ready");
      })
      .catch(() => {
        if (active) setCatalogStatus("error");
      });
    return () => { active = false; };
  }, [catalog, open, retryCount]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const selectEmoji = (item: EmojiEntry): void => {
    setRecentEmojis((current) => [
      item.emoji,
      ...current.filter((emoji) => emoji !== item.emoji),
    ].slice(0, 24));
    onSelect(item.emoji);
    setQuery("");
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const sectionTitle = query.trim() ? "Search results" : activeCategory;

  return (
    <div className={styles.picker} ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Add emoji"
        className={styles.trigger}
        disabled={disabled}
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true" className={styles.triggerIcon}>😀</span>
        <span>Emoji</span>
      </button>

      {open && (
        <div
          aria-label="Emoji picker"
          className={styles.menu}
          id={menuId}
          role="dialog"
          onKeyDown={handleKeyDown}
        >
          <div className={styles.menuHeading}>
            <span className={styles.menuTitle}>Choose an emoji</span>
            <span className={styles.totalCount}>{catalog?.length.toLocaleString() ?? "3,000+"}</span>
          </div>

          <div className={styles.search}>
            <label className={styles.screenReaderOnly} htmlFor={searchId}>Search emojis</label>
            <span aria-hidden="true" className={styles.searchIcon}>⌕</span>
            <input
              autoComplete="off"
              id={searchId}
              placeholder="Search emoji"
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
            {query && (
              <button
                aria-label="Clear emoji search"
                className={styles.clearSearch}
                type="button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
              >
                ×
              </button>
            )}
          </div>

          <nav aria-label="Emoji categories" className={styles.categories}>
            {CATEGORIES.map((category) => (
              <button
                aria-label={category.name}
                aria-pressed={activeCategory === category.name && !query.trim()}
                className={styles.category}
                key={category.name}
                title={category.name}
                type="button"
                onClick={() => {
                  setActiveCategory(category.name);
                  setQuery("");
                }}
              >
                {category.icon}
              </button>
            ))}
          </nav>

          <div className={styles.resultsHeading}>
            <span>{sectionTitle}</span>
            <span>{results.length.toLocaleString()}</span>
          </div>

          {catalogStatus === "error" ? (
            <div className={styles.loadError}>
              <p>Emoji couldn’t load.</p>
              <button
                type="button"
                onClick={() => {
                  setCatalogStatus("idle");
                  setRetryCount((current) => current + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : !catalog ? (
            <p aria-live="polite" className={styles.emptyState}>Loading emojis…</p>
          ) : results.length ? (
            <div aria-label={sectionTitle} className={styles.emojiGrid}>
              {results.map((item) => (
                <button
                  aria-label={"Insert " + item.name}
                  className={styles.emoji}
                  key={item.emoji}
                  title={item.name}
                  type="button"
                  onClick={() => selectEmoji(item)}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>No emoji found. Try another search.</p>
          )}

        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
