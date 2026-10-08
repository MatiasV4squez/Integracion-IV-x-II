import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    include: ['test/reputacion.postgres-spec.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
