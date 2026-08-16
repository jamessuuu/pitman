import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// pitman ships as a plain static SPA — no server surface, mic capture and
// on-device inference are both client-side (docs/DEVIATIONS.md, M0).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
