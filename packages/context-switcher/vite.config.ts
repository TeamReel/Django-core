import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DjangoCoreContextSwitcher',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@django-core/api-client', '@django-core/design-system'],
    },
    sourcemap: true,
    minify: 'terser',
  },
});
