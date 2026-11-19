// Run progress that survives a refresh (but not closing the tab): kept in sessionStorage.
import { useCallback, useEffect, useState } from 'react'

const KEY = (k: string) => `qg:run:${k}`

export function loadRun<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(KEY(key))
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}
export function saveRun(key: string, value: unknown): void {
  try {
    if (value == null) sessionStorage.removeItem(KEY(key))
    else sessionStorage.setItem(KEY(key), JSON.stringify(value))
  } catch {
    /* storage unavailable: the run just won't survive a refresh */
  }
}

/**
 * useState that is also kept for this tab, so a refresh mid-run resumes it. When the key changes
 * (the next try, another challenge) the value is loaded for the new key instead of carried over.
 */
export function useRunState<T>(key: string, initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void] {
  const fresh = () => loadRun<T>(key, typeof initial === 'function' ? (initial as () => T)() : initial)
  const [state, setState] = useState(() => ({ key, value: fresh() }))
  let current = state
  if (state.key !== key) {
    current = { key, value: fresh() }
    setState(current) // React re-renders straight away with the new key's value
  }
  useEffect(() => saveRun(current.key, current.value), [current.key, current.value])
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setState((s) => ({ key: s.key, value: typeof v === 'function' ? (v as (prev: T) => T)(s.value) : v }))
  }, [])
  return [current.value, set]
}
