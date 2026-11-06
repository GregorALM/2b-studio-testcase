import { useEffect, useState } from 'react'

type Result<T> = { data: T; error: { message: string } | null }

/** Загружает данные при монтировании и смене deps; reload() — загрузить заново. */
export function useLoad<T>(load: () => PromiseLike<Result<T>>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error?: string }>()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    load().then(({ data, error }) => {
      if (alive) setState({ data, error: error?.message })
    })
    return () => {
      alive = false
    }
  }, [...deps, version])

  return { data: state?.data ?? null, error: state?.error, isLoading: !state, reload: () => setVersion((v) => v + 1) }
}
