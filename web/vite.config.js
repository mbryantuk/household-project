import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const rootPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __SYSTEM_VERSION__: JSON.stringify(rootPkg.version)
  },
  server: {
    proxy: {
      // Proxy API requests to the backend
      '/auth': 'http://localhost:4001',
      '/households': 'http://localhost:4001',
      '/members': 'http://localhost:4001',
      '/admin': 'http://localhost:4001',
      '/users': 'http://localhost:4001',
      '/system': 'http://localhost:4001',
      '/my-households': 'http://localhost:4001',
    }
  }
})