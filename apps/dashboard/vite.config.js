import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4512,
    host: true,
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  preview: {
    port: 4512,
  },
});
