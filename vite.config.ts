import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Hosts allowed to reach the dev server. Supplied by the environment so that a
 * preview hostname is never hardcoded in the repository. Production builds are
 * unaffected.
 */
const previewHosts = (process.env.PREVIEW_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: previewHosts.length ? previewHosts : undefined,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: previewHosts.length ? previewHosts : undefined,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
