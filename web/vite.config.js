import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPkg = JSON.parse(fs.readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  define: {
    __SYSTEM_VERSION__: JSON.stringify(rootPkg.version)
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:4001',
      '/households': 'http://localhost:4001',
      '/members': 'http://localhost:4001',
      '/admin': 'http://localhost:4001',
      '/users': 'http://localhost:4001',
      '/system': 'http://localhost:4001',
      '/my-households': 'http://localhost:4001',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/unit/setup.js',
    css: true,
  },
});
