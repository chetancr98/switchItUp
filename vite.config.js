import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1500 }, // all markdown content is bundled into the main chunk on purpose
  server: { port: 5173, open: false },
})
