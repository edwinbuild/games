// Short looping scenes of each game's key moment, for the home page cards.
// Pure CSS animation (styles in site.css, "Card demos"); they run only while the card is on screen,
// and with reduced motion each freezes on its key frame.
import type { ReactNode } from 'react'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

function StackTowerDemo() {
  return (
    <span className="demo demo-st">
      <span className="demo-block" style={{ left: 30, width: 80, bottom: 0 }} />
      <span className="demo-block" style={{ left: 40, width: 70, bottom: 14 }} />
      <span className="demo-st-mover">
        <span className="demo-block" style={{ left: 0, width: 54, bottom: 0 }} />
        <span className="demo-block demo-st-cut" style={{ left: 54, width: 16, bottom: 0 }} />
      </span>
    </span>
  )
}

function FlipGridDemo() {
  const plus = new Set([7, 11, 12, 13, 17])
  return (
    <span className="demo demo-fg">
      <span className="demo-fg-grid">
        {range(25).map((i) => <span key={i} className={plus.has(i) ? 'demo-fg-hit' : i === 3 || i === 21 ? 'demo-fg-on' : undefined} />)}
      </span>
      <span className="demo-tap demo-fg-tap" />
    </span>
  )
}

function TugDemo() {
  return (
    <span className="demo demo-tug">
      <span className="demo-tug-rope" />
      <span className="demo-tug-knot" />
      <span className="demo-tug-p demo-tug-a"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" /></svg></span>
      <span className="demo-tug-p demo-tug-b"><svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /></svg></span>
    </span>
  )
}

export const DEMOS: Record<string, () => ReactNode> = {
  'stack-tower': StackTowerDemo,
  'flip-grid': FlipGridDemo,
  'tug-of-taps': TugDemo,
}
