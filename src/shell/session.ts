// Run progress that survives a refresh (but not closing the tab): kept in sessionStorage.
import { useEffect, useState } from 'react'

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

/** useState that is also kept for this tab, so a refresh mid-run resumes it. */
export function useRunState<T>(key: string, initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => loadRun<T>(key, typeof initial === 'function' ? (initial as () => T)() : initial))
  useEffect(() => saveRun(key, value), [key, value])
  return [value, setValue]
}
