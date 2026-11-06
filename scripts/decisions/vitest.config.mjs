import { defineConfig } from 'vitest/config';
// Standalone tooling tests need no Prisma database or application global setup.
export default defineConfig({ test: { include: ['scripts/decisions/*.test.mjs'] } });
