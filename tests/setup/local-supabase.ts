import type { TestProject } from 'vitest/node'
import { localSupabase } from '../../scripts/local-supabase.ts'

// Берём адрес и ключи из запущенного `supabase start`, чтобы `npm test` работал без настройки.
export default function setup(project: TestProject) {
  project.provide('supabase', localSupabase())
}

declare module 'vitest' {
  export interface ProvidedContext {
    supabase: { url: string; publishableKey: string; secretKey: string }
  }
}
