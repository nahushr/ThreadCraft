import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        native: "src/native/index.tsx",
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
      cssFileName: "threadcraft",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", "react-native"],
    },
  },
});
