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
  define: {
    'import.meta.env.VITE_PRODUCT_MODE': JSON.stringify(process.env.VITE_PRODUCT_MODE ?? ''),
  },
  build: {
    outDir: '../server/static',
    emptyOutDir: true,
  },
})
