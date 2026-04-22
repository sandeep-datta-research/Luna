import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = (env.VITE_API_URL || "http://localhost:5112").replace(/\/$/, "");

  return {
    base: "./",
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;

            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
              return "vendor-react";
            }

            if (id.includes("framer-motion") || id.includes("/motion/")) {
              return "vendor-motion";
            }

            if (id.includes("ogl") || id.includes("cobe")) {
              return "vendor-3d";
            }

            if (id.includes("katex")) {
              return "vendor-katex";
            }

            if (id.includes("highlight.js")) {
              return "vendor-highlight";
            }

            if (id.includes("react-markdown") || id.includes("remark-") || id.includes("rehype-")) {
              return "vendor-markdown-core";
            }

            if (id.includes("@radix-ui")) {
              return "vendor-ui";
            }

            return "vendor-misc";
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/health": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
