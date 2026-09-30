import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: 'popup.html' } },
  server: { host: '0.0.0.0', allowedHosts: true },
});
