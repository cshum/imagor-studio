import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist-embedded',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'embedded.html'),
      },
    },
  },
  server: {
    port: 5174, // Different port from main app
  },
})
