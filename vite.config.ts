import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// Deployed to GitHub Pages at https://<user>.github.io/yahrah/
// Override with VITE_BASE=/ for root-domain hosts (Cloudflare Pages, Netlify).
const base = process.env.VITE_BASE ?? '/yahrah/'

export default defineConfig({
  base,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/*.woff2'],
      manifest: {
        name: 'Yahrah - Wardens of the Weave',
        short_name: 'Yahrah',
        description:
          'A cybersecurity learning RPG. Train from zero to Security+ ready through quests, battles and simulated labs.',
        theme_color: '#1b2430',
        background_color: '#0e1319',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,json}'],
        // Content JSON is bundled, so the app is fully playable offline.
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
})
