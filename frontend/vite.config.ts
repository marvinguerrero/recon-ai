import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Express runs on 5000; the React app can call `/api/...` in dev without CORS issues.
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
