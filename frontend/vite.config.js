import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: process.env.GITHUB_ACTIONS ? '/terminal-xterm/' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 8015,
    proxy: {
      '/api': {
        target: 'http://localhost:8025',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:8025',
        ws: true
      }
    }
  }
})