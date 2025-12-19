import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildClient() {
  try {
    console.log('🔨 Building client...');
    await build({
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../client/src'),
          '@shared': path.resolve(__dirname, '../shared'),
          '@assets': path.resolve(__dirname, '../attached_assets'),
        },
      },
      root: path.join(__dirname, '../client'),
      build: {
        outDir: path.join(__dirname, '../dist/public'),
        emptyOutDir: true,
      },
    });
    console.log('✅ Build completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Build failed:', error);
    return false;
  }
}
