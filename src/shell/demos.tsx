// Short looping scenes of each game's key moment, for the home page cards.
// Pure CSS animation: shared styles live in site.css ("Card demos"); one-off keyframes are
// generated here. Scenes run only while their card is on screen, and with reduced motion each
// freezes on its key frame (`--still`). Every animation in a scene shares the scene's duration.
import type { CSSProperties, ReactNode } from 'react'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const names = new Map<string, string>()

/** A span animated by the given keyframe body, looping every `d` seconds. */
function A({ d, k, ease = 'linear', className, style, children }: { d: number; k: string; ease?: string; className?: string; style?: CSSProperties; children?: ReactNode }) {
  let name = names.get(k)
  if (!name) names.set(k, (name = `dk${names.size}`))
  return (
    <>
      <style>{`@keyframes ${name}{${k}}`}</style>
      <span className={className} style={{ ...style, animation: `${name} ${d}s ${ease} infinite` }}>{children}</span>
    </>
  )
}

/** Keyframes that show an element only inside the given windows (percent of the loop). */
function show(ws: [number, number][]): string {
  let s = ws[0][0] > 0 ? '0%{opacity:0}' : ''
  for (const [a, b] of ws) {
    if (a > 0) s += `${a - 0.1}%{opacity:0}`
    s += `${a}%{opacity:1}${b}%{opacity:1}`
    if (b < 100) s += `${b + 0.1}%{opacity:0}`
  }
  return ws[ws.length - 1][1] < 100 ? s + '100%{opacity:0}' : s
}

/** Keyframes for a tap ring landing at the given percent. */
const ring = (at: number) => `0%,${at - 6}%{opacity:0;transform:scale(1.6)}${at}%{opacity:1;transform:scale(1)}${at + 8}%,100%{opacity:0;transform:scale(.7)}`

function Tap({ d, at, x, y }: { d: number; at: number; x: number; y: number }) {
  return <A d={d} k={ring(at)} ease="ease-out" className="demo-tap" style={{ left: x, top: y }} />
}

/** Text that changes over the loop: [text, from%, to%]. */
function Frames({ d, frames, style }: { d: number; frames: [string, number, number][]; style?: CSSProperties }) {
  return <>{frames.map(([t, a, b]) => <A key={t + a} d={d} k={show([[a, b]])} className="demo-text" style={style}>{t}</A>)}</>
}

function Scene({ still, children, className }: { still: number; children: ReactNode; className?: string }) {
  return <span className={`demo${className ? ` ${className}` : ''}`} style={{ '--still': `-${still}s` } as CSSProperties}>{children}</span>
}

function StackTowerDemo() {
  return (
    <Scene still={2.1} className="demo-st">
      <span className="demo-block" style={{ left: 30, width: 80, bottom: 0 }} />
      <span className="demo-block" style={{ left: 40, width: 70, bottom: 14 }} />
      <span className="demo-st-mover">
        <span className="demo-block" style={{ left: 0, width: 54, bottom: 0 }} />
        <span className="demo-block demo-st-cut" style={{ left: 54, width: 16, bottom: 0 }} />
      </span>
    </Scene>
  )
}

function FlipGridDemo() {
  const plus = new Set([7, 11, 12, 13, 17])
  return (
    <Scene still={1.2} className="demo-fg">
      <span className="demo-fg-grid">
        {range(25).map((i) => <span key={i} className={plus.has(i) ? 'demo-fg-hit' : i === 3 || i === 21 ? 'demo-fg-on' : undefined} />)}
      </span>
      <span className="demo-tap demo-fg-tap" />
    </Scene>
  )
}

function TugDemo() {
  return (
    <Scene still={2.6} className="demo-tug">
      <span className="demo-tug-rope" />
      <span className="demo-tug-knot" />
      <span className="demo-tug-p demo-tug-a"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" /></svg></span>
      <span className="demo-tug-p demo-tug-b"><svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /></svg></span>
    </Scene>
  )
}

function BlindTimerDemo() {
  const d = 3.6
  return (
    <Scene still={2.9}>
      <span className="demo-box" style={{ left: 14, top: 4, width: 112, height: 44 }}>
        <Frames d={d} style={{ fontSize: 22 }} frames={[['0.00', 0, 8], ['0.41', 8, 16], ['0.83', 16, 24], ['?.??', 24, 62], ['7.26', 62, 100]]} />
      </span>
      <Tap d={d} at={60} x={70} y={26} />
      <span className="demo-small" style={{ left: 14, top: 58 }}>Target 7.30</span>
      <A d={d} k={show([[66, 100]])} className="demo-small" style={{ right: 14, top: 58 }}>0.04 off</A>
    </Scene>
  )
}

function ReactionChainDemo() {
  const d = 3
  return (
    <Scene still={2.1}>
      <A d={d} className="demo-box" style={{ left: 20, top: 6, width: 100, height: 50 }} k="0%,44%{background:var(--chili)}45%,57%{background:#2fd47a}58%,100%{background:var(--paper)}">
        <Frames d={d} frames={[['Wait…', 0, 44], ['TAP!', 45, 57], ['243 ms', 58, 100]]} />
      </A>
      <Tap d={d} at={54} x={70} y={31} />
      <span className="demo-small" style={{ left: 20, top: 62 }}>Round 3 of 5</span>
    </Scene>
  )
}

function OddGridDemo({ common, odd, oddAt, at, d, win }: { common: string; odd: string; oddAt: number; at: number; d: number; win: [number, number] }) {
  return (
    <A d={d} k={show([win])} className="demo-odd">
      {range(12).map((i) => <span key={i}>{i === oddAt ? odd : common}</span>)}
      <Tap d={d} at={at} x={(oddAt % 4) * 23 + 10} y={Math.floor(oddAt / 4) * 23 + 10} />
    </A>
  )
}

function OddOneOutDemo() {
  const d = 3.4
  return (
    <Scene still={1.25}>
      <OddGridDemo d={d} common="🍎" odd="🍅" oddAt={6} at={38} win={[0, 50]} />
      <OddGridDemo d={d} common="⚽" odd="🏀" oddAt={9} at={88} win={[50, 100]} />
    </Scene>
  )
}

function MemoryPathDemo() {
  const d = 3.6
  const path: [number, number, number][] = [[5, 5, 55], [6, 18, 66], [10, 31, 77]] // cell, shown at, tapped at
  const pos = (i: number) => ({ x: 79 + (i % 4) * 16, y: 8 + Math.floor(i / 4) * 16 })
  return (
    <Scene still={2.45}>
      {range(16).map((i) => {
        const p = path.find(([c]) => c === i)
        const { x, y } = pos(i)
        return (
          <span key={i} className="demo-mp-cell" style={{ left: x, top: y }}>
            {p && <A d={d} k={show([[p[1], p[1] + 9], [p[2], p[2] + 7]])} className="demo-mp-lit" />}
          </span>
        )
      })}
      {path.map(([c, , t]) => <Tap key={c} d={d} at={t} x={pos(c).x + 6.5} y={pos(c).y + 6.5} />)}
      <A d={d} k={show([[0, 45]])} className="demo-small" style={{ left: 2, top: 30 }}>Watch</A>
      <A d={d} k={show([[50, 92]])} className="demo-small" style={{ left: 2, top: 30 }}>Repeat</A>
    </Scene>
  )
}

function wave(lambda: number): string {
  let s = ''
  for (let x = 0; x <= 120; x += 2) s += `${x ? 'L' : 'M'}${x} ${(20 - 12 * Math.sin((x / lambda) * 2 * Math.PI)).toFixed(1)}`
  return s
}
function PitchMatchDemo() {
  const d = 3.6
  const steps: [number, number, number][] = [[64, 0, 22], [46, 22, 42], [36, 42, 62], [30, 62, 100]]
  return (
    <Scene still={2.9}>
      <svg className="demo-wave" viewBox="0 0 120 40" style={{ left: 10, top: 2 }}>
        <path d={wave(30)} className="demo-wave-target" />
      </svg>
      {steps.map(([l, a, b]) => (
        <A key={l} d={d} k={show([[a, b]])} className="demo-wave-wrap" style={{ left: 10, top: 2 }}>
          <svg className="demo-wave" viewBox="0 0 120 40"><path d={wave(l)} /></svg>
        </A>
      ))}
      <span className="demo-track" style={{ left: 16, top: 56, width: 108 }} />
      <A d={d} className="demo-knob" style={{ left: 16, top: 50 }} ease="ease-in-out" k="0%,8%{transform:translateX(0)}22%{transform:translateX(30px)}42%{transform:translateX(52px)}62%,92%{transform:translateX(66px)}100%{transform:translateX(0)}" />
      <A d={d} k={show([[66, 96]])} className="demo-small" style={{ right: 6, top: 4 }}>Match ✓</A>
    </Scene>
  )
}

function LuckiestDemo() {
  const d = 4
  const nums = [34, 87, 12, 61, 9]
  const picked = 3
  return (
    <Scene still={3.2}>
      {nums.map((n, i) => {
        const mine = i === picked
        const flip = mine ? 40 : 57
        const k = mine
          ? '0%,35%{transform:none}40%{transform:scaleX(0)}45%,94%{transform:translateY(-6px)}100%{transform:none}'
          : '0%,52%{transform:none}57%{transform:scaleX(0)}62%,100%{transform:none}'
        return (
          <A key={i} d={d} k={k} className={`demo-lp-card${mine ? ' demo-lp-mine' : ''}`} style={{ left: 22 + i * 20, top: 22 }}>
            <A d={d} k={show([[0, flip], [96, 100]])} className="demo-lp-back" />
            <A d={d} k={show([[flip, 96]])} className="demo-text" style={{ fontSize: 10 }}>{String(n)}</A>
          </A>
        )
      })}
      <Tap d={d} at={32} x={22 + picked * 20 + 9} y={36} />
      <A d={d} k={show([[66, 96]])} className="demo-small" style={{ left: 22, top: 6 }}>Best was 87</A>
    </Scene>
  )
}

function TapDuelDemo() {
  const d = 3.2
  const panel = (x: number, win: boolean, shape: ReactNode, after: string) => (
    <A d={d} className="demo-box" style={{ left: x, top: 4, width: 62, height: 52 }}
      k={win ? '0%,40%{background:var(--chili)}41%,50%{background:#2fd47a}51%,100%{background:var(--paper)}' : '0%,40%{background:var(--chili)}41%,56%{background:#2fd47a}57%,100%{background:var(--paper)}'}>
      <span className="demo-shape">{shape}</span>
      <Frames d={d} frames={[['Wait', 0, 40], ['GO', 41, win ? 50 : 56], [after, win ? 51 : 57, 100]]} />
    </A>
  )
  return (
    <Scene still={2.3}>
      {panel(6, false, <svg viewBox="0 0 16 16" fill="var(--coral)"><circle cx="8" cy="8" r="6" /></svg>, 'Late')}
      {panel(72, true, <svg viewBox="0 0 16 16" fill="var(--aqua)"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /></svg>, '+1')}
      <Tap d={d} at={48} x={103} y={32} />
      <span className="demo-small" style={{ left: 6, top: 62 }}>First to 3</span>
    </Scene>
  )
}

function ThisOrThatDemo() {
  const d = 3.6
  return (
    <Scene still={2.9}>
      <A d={d} className="demo-box demo-emoji" style={{ left: 22, top: 2, width: 44, height: 34 }} k="0%,23%{background:var(--paper)}24%,96%{background:var(--line)}100%{background:var(--paper)}">☕</A>
      <span className="demo-box demo-emoji" style={{ left: 74, top: 2, width: 44, height: 34 }}>🍵</span>
      <Tap d={d} at={22} x={44} y={19} />
      <span className="demo-box" style={{ left: 16, top: 46, width: 108, height: 14, borderRadius: 4 }}>
        <A d={d} className="demo-tot-fill" ease="ease-out" k="0%,52%{width:0}74%,96%{width:64%}100%{width:0}" />
      </span>
      <A d={d} k={show([[34, 96]])} className="demo-tot-guess" style={{ left: 16 + 108 * 0.55 }} />
      <A d={d} k={show([[76, 96]])} className="demo-small" style={{ left: 16, top: 64 }}>64% picked ☕</A>
    </Scene>
  )
}

function ColorRecallDemo() {
  const d = 4
  return (
    <Scene still={3.4}>
      <span className="demo-box" style={{ left: 24, top: 2, width: 40, height: 40, background: 'hsl(172 58% 46%)' }}>
        <A d={d} k={show([[28, 78]])} className="demo-text" style={{ background: 'var(--paper)' }}>?</A>
      </span>
      <A d={d} className="demo-box" style={{ left: 76, top: 2, width: 40, height: 40 }} k="0%,30%{background:hsl(0 0% 80%)}52%{background:hsl(120 45% 55%)}72%,100%{background:hsl(170 56% 47%)}" />
      {[0, 1, 2].map((r) => (
        <span key={r}>
          <span className="demo-track" style={{ left: 24, top: 50 + r * 8, width: 92 }} />
          <A d={d} className="demo-knob demo-knob--sm" ease="ease-in-out" style={{ left: 24, top: 47 + r * 8 }}
            k={`0%,${30 + r * 4}%{transform:translateX(${[10, 70, 30][r]}px)}${62 + r * 4}%,100%{transform:translateX(${[44, 50, 46][r]}px)}`} />
        </span>
      ))}
    </Scene>
  )
}

const DOTS = [[12, 8], [30, 20], [48, 6], [70, 14], [92, 8], [104, 26], [20, 30], [40, 34], [62, 28], [84, 32], [10, 18], [56, 16], [78, 4], [98, 16], [34, 10], [26, 22], [66, 36], [88, 22], [46, 24], [16, 36], [74, 24], [100, 34], [54, 36], [38, 18]]
function CountFlashDemo() {
  const d = 3.6
  return (
    <Scene still={2.9}>
      <span className="demo-box" style={{ left: 10, top: 2, width: 120, height: 46 }}>
        <A d={d} k={show([[0, 22], [70, 100]])} className="demo-dots">
          {DOTS.map(([x, y], i) => <span key={i} style={{ left: x, top: y }} />)}
        </A>
        <A d={d} k={show([[22, 70]])} className="demo-text">?</A>
      </span>
      <span className="demo-box" style={{ left: 10, top: 54, width: 44, height: 18, borderRadius: 4 }}>
        <Frames d={d} style={{ fontSize: 11 }} frames={[['_', 22, 40], ['2_', 40, 50], ['22', 50, 100]]} />
      </span>
      <A d={d} k={show([[72, 100]])} className="demo-small" style={{ left: 62, top: 60 }}>Real: 24</A>
    </Scene>
  )
}

function AngleEyeDemo() {
  const d = 3.4
  return (
    <Scene still={2.6}>
      <span className="demo-ray" style={{ left: 30, top: 62 }} />
      <A d={d} k={show([[62, 96]])} className="demo-ray demo-ray--true" style={{ left: 30, top: 62, transform: 'rotate(-60deg)' }} />
      <A d={d} className="demo-ray demo-ray--move" style={{ left: 30, top: 62 }} ease="ease-in-out" k="0%,6%{transform:rotate(-12deg)}30%{transform:rotate(-74deg)}52%,96%{transform:rotate(-58deg)}100%{transform:rotate(-12deg)}">
        <span className="demo-ray-knob" />
      </A>
      <span className="demo-small" style={{ right: 2, top: 36 }}>Make 60°</span>
      <A d={d} k={show([[64, 96]])} className="demo-small" style={{ right: 2, top: 48 }}>2° off</A>
    </Scene>
  )
}

function ReactionOnlineDemo() {
  const d = 3.4
  const phone = (x: number, ms: string, tapAt: number) => (
    <A d={d} className="demo-box demo-phone" style={{ left: x, top: 6, width: 36, height: 58 }}
      k={`0%,40%{background:var(--chili)}41%,${tapAt}%{background:#2fd47a}${tapAt + 1}%,100%{background:var(--paper)}`}>
      <Frames d={d} style={{ fontSize: 10 }} frames={[['Wait', 0, 40], ['TAP', 41, tapAt], [ms, tapAt + 1, 100]]} />
    </A>
  )
  return (
    <Scene still={2.6}>
      <span className="demo-link" />
      {phone(18, '198', 47)}
      {phone(86, '231', 52)}
      <Tap d={d} at={47} x={36} y={35} />
      <Tap d={d} at={52} x={104} y={35} />
      <A d={d} k={show([[60, 96]])} className="demo-small" style={{ left: 22, top: -2 }}>+1</A>
    </Scene>
  )
}

function SpotRaceDemo() {
  const d = 3.6
  const board = (x: number, odd: number, taps: number[], levels: [string, number, number][], color: string) => (
    <>
      <span className="demo-chip" style={{ left: x, top: 2, background: `var(--${color})` }}>
        <Frames d={d} style={{ fontSize: 9 }} frames={levels} />
      </span>
      <span className="demo-sr-board" style={{ left: x, top: 22 }}>
        {range(9).map((i) => <span key={i} className={i === odd ? 'is-odd' : undefined} />)}
      </span>
      {taps.map((t) => <Tap key={t} d={d} at={t} x={x + (odd % 3) * 15 + 6} y={22 + Math.floor(odd / 3) * 15 + 6} />)}
    </>
  )
  return (
    <Scene still={2.4}>
      {board(22, 4, [28, 58], [['Lv 1', 0, 30], ['Lv 2', 30, 60], ['Lv 3', 60, 100]], 'coral')}
      {board(78, 7, [43], [['Lv 1', 0, 45], ['Lv 2', 45, 100]], 'aqua')}
    </Scene>
  )
}

export const DEMOS: Record<string, () => ReactNode> = {
  'blind-timer': BlindTimerDemo,
  'reaction-chain': ReactionChainDemo,
  'odd-one-out': OddOneOutDemo,
  'memory-path': MemoryPathDemo,
  'pitch-match': PitchMatchDemo,
  'luckiest-person': LuckiestDemo,
  'tap-duel': TapDuelDemo,
  'this-or-that': ThisOrThatDemo,
  'color-recall': ColorRecallDemo,
  'count-flash': CountFlashDemo,
  'tug-of-taps': TugDemo,
  'angle-eye': AngleEyeDemo,
  'reaction-online': ReactionOnlineDemo,
  'flip-grid': FlipGridDemo,
  'spot-race': SpotRaceDemo,
  'stack-tower': StackTowerDemo,
}
