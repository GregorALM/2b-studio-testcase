import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { localSupabase } from './scripts/local-supabase.ts'

export default defineConfig(({ command, mode }) => {
  // `npm run dev` ходит в локальный Supabase; сборка и `vite --mode cloud` — в облако из .env
  if (command === 'serve' && mode === 'development') {
    const local = localSupabase()
    // переменные окружения у Vite важнее .env
    process.env.VITE_SUPABASE_URL = local.url
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = local.publishableKey
  }
  return { plugins: [react()] }
})
