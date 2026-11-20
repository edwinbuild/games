import { useEffect, useState } from 'react'
import { ToggleChip } from '../ui/components'
import { onSoundChange, setSound, soundOn } from './feel'

/** The site-wide sound switch, remembered across games. */
export function SoundToggle() {
  const [on, setOn] = useState(soundOn)
  useEffect(() => onSoundChange(setOn), [])
  return <ToggleChip label="Sound" on={on} onChange={setSound} />
}
