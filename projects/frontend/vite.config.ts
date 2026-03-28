import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5177,
    proxy: {
      '/api': {
        target: 'http://localhost:5264',
        changeOrigin: true,
        secure: false,
      },
      '/files': {
        target: 'http://localhost:5264',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
