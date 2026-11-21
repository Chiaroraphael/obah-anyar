
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Obah Anyar',
        short_name: 'Obah Anyar',
        description: 'Gerak warisan, cara belajar yang baru.',
        lang: 'id',
        theme_color: '#1C1F4A',
        background_color: '#F7F1E4',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['**/mediapipe/**', '**/assets/tfjs-*.js'],
        // TF.js (besar) tidak di-precache; di-cache saat pertama dipakai (runtimeCaching di bawah).
        maximumFileSizeToCacheInBytes: 1.5 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'aset-js', expiration: { maxEntries: 40 } },
          },
          {
            // Model pose MediaPipe dari server Google, di-cache sekali.
            urlPattern: /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'mediapipe-models', expiration: { maxEntries: 6, maxAgeSeconds: 60 * 60 * 24 * 90 } },
          },
          {
            urlPattern: /\/mediapipe\/wasm\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'mediapipe-wasm' },
          },
          {
            // Data gerak & video tarian yang pernah dibuka → bisa dipakai offline.
            urlPattern: /\/storage\/v1\/object\/public\/(step-videos|step-keypoints|ai-models)\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'tarian', expiration: { maxEntries: 200 } },
          },
          {
            urlPattern: /\/rest\/v1\/(dances|steps|dance_props)/,
            handler: 'NetworkFirst',
            options: { cacheName: 'katalog', networkTimeoutSeconds: 4 },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts' },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: ['@tanstack/react-query', '@supabase/supabase-js', 'zustand'],
          tfjs: ['@tensorflow/tfjs'],
        },
      },
    },
  },
});
