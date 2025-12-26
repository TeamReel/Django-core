import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@django-core/design-system/tokens.css': path.resolve(__dirname, '../../packages/design-system/dist/tokens.css'),
      '@django-core/theme-system/dist/style.css': path.resolve(__dirname, '../../packages/theme-system/dist/style.css'),
      '@django-core/design-system': path.resolve(__dirname, './src/shims/design-system'),
      '@django-core/context-switcher': path.resolve(__dirname, '../../packages/context-switcher/src/index.ts'),
      '@django-core/page-templates': path.resolve(__dirname, '../../packages/page-templates/src/index.ts'),
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
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep Chart.js in its own chunk for lazy loading
          'chartjs-vendor': ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
});
