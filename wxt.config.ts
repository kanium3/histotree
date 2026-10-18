import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import path from "node:path";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  manifest: {
    name: "Histotree",
    description: "Browse your history as a network graph.",
    permissions: ["history", "storage", "tabs"],
    browser_specific_settings: {
      gecko: {
        id: "histotree@kanium.me",
        data_collection_permissions: {
            required: ["none"]
        }
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
  }),
});
