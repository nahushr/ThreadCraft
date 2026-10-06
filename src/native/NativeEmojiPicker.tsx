import { useMemo, useState } from "react";
import type { JSX } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import emojiEntriesJson from "../data/emojis.json";
import { nativeStyles as styles } from "./styles";

interface EmojiEntry {
  group: string;
  emoji: string;
  name: string;
}

interface NativeEmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const emojiEntries = emojiEntriesJson as EmojiEntry[];
const emojiCategories = [
  "Smileys & Emotion",
  "People & Body",
  "Animals & Nature",
  "Food & Drink",
  "Travel & Places",
  "Activities",
  "Objects",
  "Symbols",
  "Flags",
];

const NativeEmojiPicker = ({ visible, onClose, onSelect }: NativeEmojiPickerProps): JSX.Element => {
  const [activeCategory, setActiveCategory] = useState(emojiCategories[0]);
  const categoryEmojis = useMemo(
    () => emojiEntries.filter((item) => item.group === activeCategory),
    [activeCategory],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.emojiSheet}>
          <View style={styles.emojiSheetHeading}>
            <Text style={styles.emojiTitle}>Choose an emoji</Text>
            <Pressable accessibilityRole="button" style={styles.modalClose} onPress={onClose}>
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
            {emojiCategories.map((category) => (
              <Pressable
                accessibilityState={{ selected: activeCategory === category }}
                key={category}
                style={[styles.categoryButton, activeCategory === category && styles.categorySelected]}
                onPress={() => setActiveCategory(category)}
              >
                <Text style={styles.categoryText}>{category}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView>
            <View style={styles.emojiGrid}>
              {categoryEmojis.map((item) => (
                <Pressable
                  accessibilityLabel={item.name}
                  accessibilityRole="button"
                  key={item.emoji}
                  style={styles.emojiButton}
                  onPress={() => onSelect(item.emoji)}
                >
                  <Text style={styles.emojiText}>{item.emoji}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default NativeEmojiPicker;
