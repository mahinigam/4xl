import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Build optimization
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Increase chunk size warning for ONNX runtime (~2MB WASM)
    chunkSizeWarningLimit: 3000,
  },

  // Ensure WASM files are handled correctly
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  
  // Dev server configuration
  server: {
    port: 3000,
    host: true,
    // Proxy API requests to backend during local development
    proxy: {
      '/api': {
        target: 'http://localhost:7860',
        changeOrigin: true,
      },
    },
  },
  
  // Preview server (for testing production build locally)
  preview: {
    port: 3000,
  },
})
