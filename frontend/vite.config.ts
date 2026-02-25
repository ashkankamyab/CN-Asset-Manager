import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/assets/export': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/oidc': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
