import path from 'path'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Configure environment file loading
  envDir: './',
  envPrefix: 'VITE_',
  build: {
    outDir: '../server/static',
    emptyOutDir: true,
  },
})
