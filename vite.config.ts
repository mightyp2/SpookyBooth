import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // allow Cloudflare ephemeral tunnel hosts (trycloudflare / cfargotunnel) and the current tunnel host
        allowedHosts: [
          '*.trycloudflare.com',
          '*.cfargotunnel.com',
          'realized-provinces-already-lot.trycloudflare.com',
          'agencies-isp-select-actively.trycloudflare.com',
          'not-transmit-codes-newman.trycloudflare.com',
          'janet-quit-builder-argued.trycloudflare.com'
        ],
      },
      plugins: [react()],
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
