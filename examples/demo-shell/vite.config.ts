import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@django-core/design-system/tokens.css': path.resolve(__dirname, '../../packages/design-system/dist/tokens.css'),
      '@django-core/design-system': path.resolve(__dirname, './src/shims/design-system'),
      '@django-core/context-switcher': path.resolve(__dirname, './src/shims/context-switcher'),
      '@django-core/page-templates': path.resolve(__dirname, './src/shims/page-templates'),
      // Force single React instance to avoid Context issues
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
