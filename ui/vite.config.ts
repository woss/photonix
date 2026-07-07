import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// Backend origin used when running Vite on the host (`npm run dev` outside
// the container). Inside the container nginx serves the API paths itself and
// only forwards page/asset/HMR traffic to Vite, so the proxy sits unused.
const backend = process.env.PHOTONIX_BACKEND || 'http://localhost:8888'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    proxy: {
      // Rewrite Origin/Referer to the backend origin so Django's CSRF
      // Origin check passes when the app is served from a different port.
      '/graphql': {
        target: backend,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', backend)
            proxyReq.setHeader('referer', `${backend}/`)
          })
        },
      },
      '/thumbnailer': backend,
      '/thumbnails': backend,
      '/download': backend,
      '/photos': backend,
    },
  },
  build: {
    outDir: 'build',
  },
})
