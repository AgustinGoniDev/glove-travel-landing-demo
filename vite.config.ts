import { defineConfig } from "vite";

// Three.js alone is ~600 kB minified (160 kB gzip): one chunk is fine for a landing.
export default defineConfig({
  build: { chunkSizeWarningLimit: 900 },
});
