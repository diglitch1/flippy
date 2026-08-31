import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static, client-side-only app. No special COOP/COEP headers needed because we use
// native <video> + <canvas> frame capture (not ffmpeg.wasm), so it deploys to any static host.
export default defineConfig({
  plugins: [react()],
  base: './',
});
