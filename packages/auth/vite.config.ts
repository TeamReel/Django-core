import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      outDir: 'dist',
    }),
    // Bundle size visualization and monitoring
    // Generates dist/stats.html with interactive treemap showing all bundled modules
    // Target: ≤15KB gzipped | Current: 6.28KB gzipped (42% of budget) ✅
    visualizer({
      filename: './dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // sunburst, treemap, network
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DjangoCoreAuth',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      // Externalize peer dependencies to avoid bundling (reduces bundle size)
      // React + design-system provided by consuming application
      external: ['react', 'react-dom', 'react/jsx-runtime', '@django-core/design-system'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@django-core/design-system': 'DjangoCoreDesignSystem',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild', // Fast minification with minimal overhead
    target: 'es2020',
  },
});
