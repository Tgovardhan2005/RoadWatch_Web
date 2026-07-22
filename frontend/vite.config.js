import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const handleProxyError = (proxy) => {
  proxy.on('error', (err, req, res) => {
    if (!res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service unavailable', online: false }));
    }
  });
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        configure: handleProxyError,
      },
      // YOLOv8 AI Microservice (port 5000)
      '/analyze-road': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: handleProxyError,
      },
      '/predict': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: handleProxyError,
      },
      '/classify-damage': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: handleProxyError,
      },
      '/analyze': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: handleProxyError,
      },
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: handleProxyError,
      },
    },
  },
})
