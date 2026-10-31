import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { globals: true, include: ['test/disponibilidad.postgres-spec.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 },
});
