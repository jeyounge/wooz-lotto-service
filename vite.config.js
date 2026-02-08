import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/lotto': {
        target: 'https://data.soledot.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lotto/, ''),
        secure: false,
      },
      '/api/ugcr': {
        target: 'https://ugcr.soledot.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ugcr/, ''),
        secure: false,
      }
    }
  }
})
