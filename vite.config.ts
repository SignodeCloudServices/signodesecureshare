import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // Local dev only: send /api to the production hostname so the invitation
  // API can be exercised from localhost without CORS. The deployed portal
  // reaches /api through Front Door's api-route on the same origin.
  server: {
    proxy: {
      "/api": { target: "https://secureshare.signode.com", changeOrigin: true, secure: true },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});