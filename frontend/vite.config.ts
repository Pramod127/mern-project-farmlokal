import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE || "http://localhost:8080";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/products": {
          target: apiBase,
          changeOrigin: true
        },
        "/health": {
          target: apiBase,
          changeOrigin: true
        },
        "/external": {
          target: apiBase,
          changeOrigin: true
        },
        "/webhooks": {
          target: apiBase,
          changeOrigin: true
        }
      }
    }
  };
});
