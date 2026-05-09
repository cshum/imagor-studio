import path from 'path'
import react from '@vitejs/plugin-react-swc'
import { defineConfig, type Plugin } from 'vite'

function htmlTitlePlugin(): Plugin {
  return {
    name: 'html-title',
    transformIndexHtml(html) {
      const title =
        process.env.VITE_MULTI_TENANT === 'true' ? 'Imagor Cloud' : 'Imagor Studio'
      return html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    },
  }
}

export default defineConfig({
  plugins: [react(), htmlTitlePlugin()],
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
