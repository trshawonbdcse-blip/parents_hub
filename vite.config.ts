import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the build works from any sub-path (e.g. GitHub Pages /parents_hub/).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered manually in main.tsx so we can also check for updates while the app stays open.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Parents Hub',
        short_name: 'Parents Hub',
        description: 'Where to go with babies and toddlers in Estonia — places, prices, events and activities.',
        theme_color: '#136f63',
        background_color: '#f6f5f2',
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
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/plus-jakarta-sans-latin-*-normal.woff2'],
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
