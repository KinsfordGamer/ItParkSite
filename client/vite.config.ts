import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,  // LAN dan ham kirish mumkin bo'lsin
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          // timeout ni oshiramiz
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.error('[proxy error]', err.message)
            })
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,         // Production da sourcemap kerak emas
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // Katta vendor modullarni ajratamiz
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
            'ui-vendor': ['react-hot-toast', 'aos'],
          },
        },
      },
    },
    preview: {
      port: 4173,
      host: true,
    },
  }
})
