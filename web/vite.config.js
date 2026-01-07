import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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