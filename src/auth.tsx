import { Alert, Button, Center, Loader, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core'
import type { Session } from '@supabase/supabase-js'
import { createContext, use, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Profile, Role } from './types'

export const roleLabel: Record<Role, string> = { manager: 'постановщик', executor: 'исполнитель' }

const MeContext = createContext<Profile | null>(null)

export function useMe() {
  const me = use(MeContext)
  if (!me) throw new Error('useMe() вызван вне <AuthGate>')
  return me
}

/** Показывает вход, пока нет сессии; дальше — приложение с профилем текущего пользователя. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>()
  const [me, setMe] = useState<Profile | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    // сразу после подписки приходит INITIAL_SESSION с сохранённой сессией или null
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    setMe(null)
    setError(undefined)
    if (!userId) return
    let alive = true
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return
        if (error) setError(error.message)
        // профиля нет — пользователя удалили (например, seed пересоздал демо): сессия больше не годится
        else if (!data) supabase.auth.signOut()
        else setMe(data)
      })
    return () => {
      alive = false
    }
  }, [userId])

  if (session === null) return <Login />
  if (error)
    return (
      <Center mih="100vh" p="md">
        <Alert color="red" title="Не удалось загрузить профиль">
          <Stack align="flex-start">
            {error}
            <Button variant="default" onClick={() => supabase.auth.signOut()}>
              Выйти
            </Button>
          </Stack>
        </Alert>
      </Center>
    )
  if (!me)
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    )
  return <MeContext value={me}>{children}</MeContext>
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [isBusy, setIsBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setIsBusy(true)
    setError(undefined)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setIsBusy(false)
    if (error) setError(error.code === 'invalid_credentials' ? 'Неверный email или пароль' : error.message)
  }

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder shadow="sm" p="xl" w="100%" maw={380}>
        <form onSubmit={submit}>
          <Stack>
            <Title order={2}>Объекты и задачи</Title>
            <TextInput
              label="Email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="Пароль"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            {error && <Alert color="red">{error}</Alert>}
            <Button type="submit" loading={isBusy}>
              Войти
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}
