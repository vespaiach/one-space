import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const dev = process.env.NODE_ENV !== "production";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    react({
      babel: {
        plugins: [
          [
            "@stylexjs/babel-plugin",
            {
              dev,
              runtimeInjection: false,
              enableInlinedConditionalMerge: true,
              treeshakeCompensation: true,
              aliases: { "@/*": [path.join(import.meta.dirname, "*")] },
              unstable_moduleResolution: { type: "commonJS" },
            },
          ],
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
  },
});
