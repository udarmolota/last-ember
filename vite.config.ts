import { defineConfig } from 'vite'

export default defineConfig({
  base: './',        // важно для Capacitor — относительные пути
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
