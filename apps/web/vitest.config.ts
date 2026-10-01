import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests de la web (por ahora, el tour guiado): React en jsdom.
export default defineConfig({
  // Next deja `jsx: preserve` en el tsconfig; para los tests, JSX de React 19.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
