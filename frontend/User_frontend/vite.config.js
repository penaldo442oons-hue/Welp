import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Force Tailwind + PostCSS from this app’s node_modules. Relying only on
// postcss.config.js discovery can fail in some monorepo / hoisted installs,
// which produces almost no utility CSS (broken layout, “plain HTML” look).
export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: {
    proxy: {
      "/api": {
        target: "https://welp-cfir.onrender.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: path.join(__dirname, "tailwind.config.js") }),
        autoprefixer(),
      ],
    },
  },
});
