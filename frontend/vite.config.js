import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineConfig({
  define: {
    // Injected at build time — use as __APP_VERSION__ in any component.
    // To bump the version, change frontend/package.json only.
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react()],
  build: {
    outDir: 'build',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
