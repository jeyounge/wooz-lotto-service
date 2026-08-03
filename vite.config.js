import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 로또 당첨번호 소스 (smok95 GitHub Pages, JSON) — soledot 대체
      '/api/lottodata': {
        target: 'https://smok95.github.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lottodata/, '/lotto/results'),
        secure: true,
      },
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
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}[extname]`
      }
    }
  }
})
