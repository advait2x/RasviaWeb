import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const previewAllowedHosts = [
  "rasvia-qjbpb.ondigitalocean.app",
  "rasvia.com"
];

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "development" ? "/" : process.env.VITE_BASE_PATH || "/",
  optimizeDeps: {
    entries: ["src/main.tsx"],
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
      "@supabase/supabase-js",
      "framer-motion",
      "recharts",
    ],
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // @ts-ignore
    allowedHosts: process.env.TEMPO === "true" ? true : undefined,
    host: "localhost",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: Number(process.env.PORT) || 8080,
    // Keep preview locked down while allowing deployment domains.
    allowedHosts: process.env.TEMPO === "true" ? true : previewAllowedHosts,
  },
});
