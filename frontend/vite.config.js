import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All /api requests during development are forwarded to the Express backend.
      // This avoids CORS issues and lets us use relative URLs in the frontend code.
      '/api': 'http://localhost:3001',
    },
  },
})
