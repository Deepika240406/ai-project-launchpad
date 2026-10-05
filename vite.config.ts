import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two build targets:
//  1. `npm run build`        -> normal multi-asset production bundle (deploy to Vercel/Netlify)
//  2. `npm run build:single` -> ONE self-contained index.html with JS+CSS inlined.
//     Used for the offline/iframe preview and for emailing a single portable demo file.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  // Only the real entry is crawled for deps. standalone-preview.html is a
  // *generated* single-file bundle that sits in the project root; when Vite's
  // optimizer walks it (its default root crawl), it tries to resolve imports
  // from inside the inlined bundle and `vite dev` dies on startup.
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // The preview proxy serves the app from https://<port>-<id>.e2b.app
    allowedHosts: true,
  },
  preview: { host: '0.0.0.0', allowedHosts: true },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
    ...(mode === 'single' ? { assetsInlineLimit: 100000000, cssCodeSplit: false } : {}),
  },
}));