import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true,
      tsconfigPath: resolve(__dirname, 'tsconfig.dts.json'),
      exclude: ['**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx', '__tests__/**'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DjangoCoreContextSwitcher',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-router-dom', '@django-core/api-client', '@django-core/design-system'],
    },
    sourcemap: true,
    minify: 'terser',
  },
});
