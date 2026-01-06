import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: [
        'kong-gdp-operates-graduate.trycloudflare.com', //Frontend URL 3000 r 5173 usually , we used 3000 in this app and as you saw, we requested the tunnel url using 3000
      'localhost',
      '127.0.0.1'
    ]
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    }
  };
});