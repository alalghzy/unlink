import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Root: folder yang berisi index.html + src/
  root: __dirname,
  plugins: [react()],
  envPrefix: "VITE_",
  server: {
    host: "0.0.0.0", // biar bisa diakses dari HP dalam LAN saat dev
    port: 5173,
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    target: "modules",
  },
  publicDir: path.resolve(__dirname, "public"),
});