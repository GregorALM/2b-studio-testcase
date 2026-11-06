import { execSync } from 'node:child_process'

/** Адрес и ключи запущенного `supabase start`. */
export function localSupabase() {
  let status: Record<string, string>
  try {
    status = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
  } catch {
    throw new Error('Локальный Supabase не запущен: выполните `supabase start`')
  }
  const url = status.API_URL
  // вызывающие создают и удаляют пользователей и данные — только локальная база
  if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    throw new Error(`Ожидался локальный Supabase, а не ${url}`)
  }
  return { url, publishableKey: status.PUBLISHABLE_KEY, secretKey: status.SECRET_KEY }
}
