import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Публичный ключ: доступ к данным ограничивают RLS-политики в базе, а не фронт
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
