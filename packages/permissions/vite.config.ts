import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DjangoCorePermissions',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@django-core/api-client',
        '@django-core/auth-ui',
        '@django-core/context-switcher',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@django-core/api-client': 'DjangoCoreApiClient',
          '@django-core/auth-ui': 'DjangoCoreAuth',
          '@django-core/context-switcher': 'DjangoCoreContextSwitcher',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
});
