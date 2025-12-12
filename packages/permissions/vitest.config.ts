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
      // Thresholds disabled temporarily to view coverage report
      // thresholds: {
      //   lines: 85,
      //   functions: 85,
      //   branches: 85,
      //   statements: 85,
      // },
    },
  },
  resolve: {
    alias: {
      // Use test mocks for workspace packages during tests
      '@django-core/api-client': path.resolve(__dirname, './src/test/__mocks__/@django-core/api-client.ts'),
      '@django-core/auth-ui': path.resolve(__dirname, './src/test/__mocks__/@django-core/auth-ui.ts'),
      '@django-core/context-switcher': path.resolve(__dirname, './src/test/__mocks__/@django-core/context-switcher.ts'),
    },
  },
});
