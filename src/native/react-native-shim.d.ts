declare module "react-native" {
  import type { ComponentType } from "react";

  type NativeProps = Record<string, unknown>;
  export type ImageStyle = Record<string, unknown>;
  export const Image: ComponentType<NativeProps>;
  export const Linking: { openURL: (url: string) => Promise<void> };
  export const Modal: ComponentType<NativeProps>;
  export const Pressable: ComponentType<NativeProps>;
  export const ScrollView: ComponentType<NativeProps>;
  export const Text: ComponentType<NativeProps>;
  export const TextInput: ComponentType<NativeProps>;
  export const View: ComponentType<NativeProps>;
  export const StyleSheet: {
    create<T extends Record<string, unknown>>(styles: T): T;
  };
}
