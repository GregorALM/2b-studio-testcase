import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { inject } from 'vitest'

const { url, publishableKey, secretKey } = inject('supabase')
const opts = { auth: { persistSession: false, autoRefreshToken: false } }

/** Сервисный клиент: обходит RLS. Только для подготовки данных и проверки результата. */
export const admin = createClient(url, secretKey, opts)
/** Клиент без входа — как любой посетитель сайта с публичным ключом. */
export const anon = () => createClient(url, publishableKey, opts)

export type User = { id: string; name: string; client: SupabaseClient }

/** Создаёт пользователя и возвращает клиент, вошедший под ним. */
export async function createUser(role: 'manager' | 'executor', name: string): Promise<User> {
  const email = `${role}-${crypto.randomUUID()}@test.local`
  const password = 'test-password-123'
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })
  if (created.error) throw created.error
  const id = created.data.user.id
  if (role === 'manager') {
    const { error } = await admin.from('profiles').update({ role: 'manager' }).eq('id', id)
    if (error) throw error
  }
  const client = anon()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return { id, name, client }
}
