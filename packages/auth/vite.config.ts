import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      outDir: 'dist',
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
    minify: 'esbuild',
    target: 'es2020',
  },
});
