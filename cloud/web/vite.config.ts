import path from 'path'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../web/src'),
      '@cloud': path.resolve(__dirname, '../../web/src/cloud'),
    },
  },
  envDir: '../../web',
  envPrefix: 'VITE_',
  define: {
    'import.meta.env.VITE_PRODUCT_MODE': JSON.stringify('cloud'),
  },
  build: {
    outDir: '../../server/static-cloud',
    emptyOutDir: true,
  },
})
