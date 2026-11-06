import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      // чистая логика фронта — без базы
      { test: { name: 'unit', include: ['src/**/*.test.ts'] } },
      // права и переходы в обход UI — на локальном Supabase
      {
        test: {
          name: 'db',
          include: ['tests/**/*.test.ts'],
          globalSetup: ['tests/setup/local-supabase.ts'],
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
})
