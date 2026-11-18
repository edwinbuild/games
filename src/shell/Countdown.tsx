import { useEffect, useState } from 'react'
import { msUntilTomorrow } from './daily'

/** "Next puzzle in 04:12:09", ticking. Reloads the page at midnight. */
export function Countdown() {
  const [ms, setMs] = useState(() => msUntilTomorrow())
  useEffect(() => {
    const id = setInterval(() => {
      const left = msUntilTomorrow()
      if (left > ms + 1000) location.reload() // crossed midnight
      setMs(left)
    }, 1000)
    return () => clearInterval(id)
  }, [ms])
  const s = Math.floor(ms / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <p className="countdown">
      Next one in{' '}
      <strong>
        {pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
      </strong>
    </p>
  )
}
