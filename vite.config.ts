import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // ✅ Load all environment variables (including VITE_ prefixed ones)
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'https://activevocab.vercel.app',
            changeOrigin: true,
            secure: true,
          }
        }
      },
      plugins: [react()],
      define: {
        // ✅ FIX: Read from VITE_ prefixed variables (matches Vercel config)
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.DEEPGRAM_API_KEY': JSON.stringify(env.VITE_DEEPGRAM_API_KEY || env.DEEPGRAM_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
