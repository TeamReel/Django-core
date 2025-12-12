import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/test/**',
        'src/test/**',
        'src/**/*.d.ts',
        'src/index.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@django-core/api-client': path.resolve(__dirname, '../api-client/src/index.ts'),
      '@django-core/auth-ui': path.resolve(__dirname, '../auth/src/index.ts'),
      '@django-core/context-switcher': path.resolve(__dirname, '../context-switcher/src/index.ts'),
    },
  },
});
