import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the build works from any sub-path (e.g. GitHub Pages /parents_hub/).
export default defineConfig({
  base: './',
  build: {
    // The map's worker ships as .mjs; give it a .js name so every server (and the iOS app) sends it as JavaScript.
    rolldownOptions: {
      output: {
        assetFileNames: (info) => (info.names?.[0]?.endsWith('.mjs') ? 'assets/[name]-[hash].js' : 'assets/[name]-[hash][extname]'),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered manually in main.tsx so we can also check for updates while the app stays open.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kuhu Minna',
        short_name: 'Kuhu Minna',
        description: 'Where to go in Estonia today — with your kids or just you.',
        theme_color: '#0f5c5c',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/geologica-latin-{400,500,600,700,800}-normal.woff2'],
        runtimeCaching: [
          {
            urlPattern: /data\/osm-places\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'osm-places', expiration: { maxEntries: 1 } },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'weather', expiration: { maxEntries: 4, maxAgeSeconds: 3 * 3600 } },
          },
        ],
      },
    }),
  ],
})
