/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@django-core/design-system/tokens.css': path.resolve(__dirname, '../packages/design-system/dist/tokens.css'),
      '@django-core/theme-system/dist/style.css': path.resolve(__dirname, '../packages/theme-system/dist/style.css'),
      '@django-core/design-system': path.resolve(__dirname, '../packages/design-system/src/index.ts'),
      '@django-core/context-switcher': path.resolve(__dirname, '../packages/context-switcher/src/index.ts'),
      '@django-core/page-templates': path.resolve(__dirname, '../packages/page-templates/src/index.ts'),
      '@django-core/auth-ui': path.resolve(__dirname, '../packages/auth/src/index.ts'),
      '@django-core/theme-system': path.resolve(__dirname, '../packages/theme-system/src/index.ts'),
      '@django-core/api-client': path.resolve(__dirname, '../packages/api-client/src/index.ts'),
      // Force single React instance to avoid Context issues
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, './node_modules/react-router-dom'),
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
        manualChunks(id) {
          // ── Vendor splits ──
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) return 'vendor-react';
            if (id.includes('react-router-dom')) return 'vendor-router';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-recharts';
            if (id.includes('react-window')) return 'vendor-virtualization';
            return 'vendor';
          }
          // ── Feature area splits ──
          if (id.includes('/pages/identity/') || id.includes('/pages/organisations/')) return 'chunk-identity';
          if (id.includes('/pages/periods/')) return 'chunk-periods';
          if (id.includes('/pages/config/')) return 'chunk-config';
          if (id.includes('/pages/platform/')) return 'chunk-platform';
          if (id.includes('/pages/frontend/')) return 'chunk-frontend-dev';
          if (id.includes('/pages/docs/')) return 'chunk-docs';
          if (id.includes('/pages/activities/')) return 'chunk-activities';
          if (id.includes('/pages/aistudio/')) return 'chunk-aistudio';
          if (id.includes('/pages/studio/')) return 'chunk-studio';
          if (id.includes('/pages/medialib/')) return 'chunk-medialib';
          if (id.includes('/pages/work/')) return 'chunk-work';
          if (id.includes('/components/CreateWizard/')) return 'chunk-create-wizard';
          if (id.includes('/components/MatchWizardV2/')) return 'chunk-match-wizard';
        },
      },
      plugins: [
        // Bundle analysis — run with: ANALYZE=true pnpm build
        ...(process.env.ANALYZE ? [visualizer({
          open: true,
          filename: 'bundle-stats.html',
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        })] : []),
      ],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    css: false,
  },
});
