import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Start the Express server immediately when vite.config.js is loaded
async function startExpressServer() {
  try {
    // Use dynamic import to load the server code
    // The server code will start the HTTP server on port 5000
    await import('./server/index.ts')
  } catch (error) {
    console.error('[Vite Config] Failed to start Express server:', error)
  }
}

// Start the server before Vite config is fully processed
startExpressServer().catch(err => console.error('Error starting Express:', err))

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    port: 5000,
    host: '0.0.0.0',
    middlewareMode: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './attached_assets'),
      '@shared': path.resolve(__dirname, './shared'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
  },
})
