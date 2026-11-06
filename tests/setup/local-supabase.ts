import { execSync } from 'node:child_process'
import type { TestProject } from 'vitest/node'

// Берём адрес и ключи из запущенного `supabase start`, чтобы `npm test` работал без настройки.
export default function setup(project: TestProject) {
  let status: Record<string, string>
  try {
    status = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
  } catch {
    throw new Error('Локальный Supabase не запущен: выполните `supabase start`')
  }
  const url = status.API_URL
  // тесты создают и удаляют пользователей и данные — только локальная база
  if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    throw new Error(`Тесты запускаются только на локальном Supabase, а не на ${url}`)
  }
  project.provide('supabase', { url, publishableKey: status.PUBLISHABLE_KEY, secretKey: status.SECRET_KEY })
}

declare module 'vitest' {
  export interface ProvidedContext {
    supabase: { url: string; publishableKey: string; secretKey: string }
  }
}
