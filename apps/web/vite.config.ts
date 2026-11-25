import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_TARGET = process.env.CANVAS_API_URL ?? 'http://127.0.0.1:5858'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  envDir: '../..',
  // Les imports `?url` de @tldraw/assets ne passent pas par le pré-bundling de dépendances.
  optimizeDeps: { exclude: ['@tldraw/assets'] },
  server: {
    port: 5173,
    strictPort: true,
    // En dev, front et API partagent la même origine via ce proxy (cookies SameSite, pas de CORS).
    proxy: {
      '/api': { target: API_TARGET, ws: true, changeOrigin: false },
    },
  },
  // Le chunk du board embarque tldraw (~1,8 Mo, chargé à la demande) : seuil relevé en connaissance de cause.
  build: { chunkSizeWarningLimit: 2000 },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
