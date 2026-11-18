import { useEffect, useState } from 'react'

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Counts the first number in `text` up to its value ("Late by 0.04s", "243 ms average"),
 * keeping its decimals and the words around it. Shows the final text at once with
 * reduced motion, or when `animate` is off (a result shown again later).
 */
export function CountUp({ text, animate = true, ms = 650 }: { text: string; animate?: boolean; ms?: number }) {
  const m = /(\d+(?:\.\d+)?)/.exec(text)
  const target = m ? Number(m[1]) : 0
  const decimals = m && m[1].includes('.') ? m[1].split('.')[1].length : 0
  const run = !!m && animate && !reducedMotion() && target > 0
  const [value, setValue] = useState(run ? 0 : target)

  useEffect(() => {
    if (!run) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, target, ms])

  if (!m) return <>{text}</>
  const shown = value.toFixed(decimals)
  return (
    <span aria-label={text}>
      <span aria-hidden="true">
        {text.slice(0, m.index)}
        <span className="count-up">{shown}</span>
        {text.slice(m.index + m[1].length)}
      </span>
    </span>
  )
}
