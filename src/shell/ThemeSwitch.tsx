import { useState } from 'react'
import { Segmented } from '../ui/components'
import { load, save } from './storage'

type Theme = 'auto' | 'light' | 'dark'

/** Auto follows the device; Light or Dark is remembered. Pages apply it before first paint (see scripts/pages.ts). */
export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(() => load<Theme>('theme', 'auto'))
  function pick(t: Theme) {
    setTheme(t)
    save('theme', t)
    if (t === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
  }
  return (
    <Segmented
      label="Theme"
      value={theme}
      onChange={pick}
      options={[
        { value: 'auto', label: 'Auto' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ]}
    />
  )
}
