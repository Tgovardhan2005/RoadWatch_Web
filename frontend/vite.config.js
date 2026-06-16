import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      // Python AI model server — road filter + damage classifier
      '/predict': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/classify-damage': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/analyze': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
    },
  },
})
