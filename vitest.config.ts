import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['tests/setup/local-supabase.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
