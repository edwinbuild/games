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


function PourLineDemo() {
  const d = 3.4
  return (
    <Scene still={2.6}>
      <span className="demo-pl-tap" />
      <A d={d} className="demo-pl-stream" k="0%,8%{clip-path:inset(0 0 100% 0)}14%,56%{clip-path:inset(0 0 0 0)}64%,100%{clip-path:inset(100% 0 0 0)}" />
      <span className="demo-pl-glass"><span className="demo-pl-inner">
        <A d={d} className="demo-pl-liquid" ease="cubic-bezier(.3,0,.4,1)" k="0%,12%{height:0}64%{height:63%}70%{height:61%}76%,94%{height:62%}100%{height:0}" />
        <span className="demo-pl-line" />
      </span></span>
      <A d={d} k={show([[72, 96]])} className="demo-small" style={{ right: 0, top: 4 }}>0.4% off</A>
    </Scene>
  )
}


function ChainPopDemo() {
  const d = 3.6
  // [x, y, size, pops at %] — popping spreads out from the tapped bubble; two are never reached.
  const bubbles: [number, number, number, number | null][] = [
    [56, 40, 9, 16], [76, 30, 7, 24], [40, 26, 7, 27], [84, 50, 8, 32], [64, 60, 6, 35],
    [100, 36, 9, 40], [30, 46, 6, 38], [118, 54, 7, 47], [116, 18, 6, null], [18, 20, 5, null],
  ]
  const popped = bubbles.filter((b) => b[3] != null).length
  return (
    <Scene still={1.75}>
      {bubbles.map(([x, y, r, p], i) => (
        <span key={i}>
          {p != null && <A d={d} className="demo-cp-ring" style={{ left: x - r, top: y - r, width: r * 2, height: r * 2 }} ease="ease-out"
            k={`0%,${p}%{transform:scale(1);opacity:0}${p + 1}%{opacity:.9}${p + 16}%{transform:scale(2.8);opacity:0}100%{opacity:0}`} />}
          {p != null
            ? <A d={d} className="demo-cp-bubble" style={{ left: x - r, top: y - r, width: r * 2, height: r * 2 }} k={`0%,${p}%{transform:scale(1);opacity:1}${p + 4}%{transform:scale(1.5);opacity:0}95%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}`} />
            : <span className="demo-cp-bubble" style={{ left: x - r, top: y - r, width: r * 2, height: r * 2 }} />}
        </span>
      ))}
      <Tap d={d} at={15} x={56} y={40} />
      <span className="demo-box" style={{ left: 0, top: 58, width: 40, height: 14, borderRadius: 7 }}>
        <Frames d={d} style={{ fontSize: 10 }} frames={[['0', 0, 16], ['3', 16, 27], ['6', 27, 38], [`${popped}`, 38, 100]]} />
      </span>
    </Scene>
  )
}


const STAR = '32.0,4.0 39.6,23.5 60.5,24.7 44.4,38.0 49.6,58.3 32.0,47.0 14.4,58.3 19.6,38.0 3.5,24.7 24.4,23.5'
function FairSliceDemo() {
  const d = 3.4
  const half = (side: 'l' | 'r') => (
    <A d={d} className="demo-fs-half" ease="cubic-bezier(.2,.9,.3,1.3)" style={{ clipPath: side === 'l' ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)' }}
      k={`0%,40%{transform:none}52%,92%{transform:translateX(${side === 'l' ? -7 : 7}px)}100%{transform:none}`}>
      <svg viewBox="0 0 64 68"><polygon points={STAR} /></svg>
    </A>
  )
  return (
    <Scene still={2.4}>
      {half('l')}
      {half('r')}
      <A d={d} className="demo-fs-knife" k="0%,18%{clip-path:inset(0 0 100% 0);opacity:1}38%{clip-path:inset(0 0 0 0);opacity:1}48%,100%{clip-path:inset(0 0 0 0);opacity:0}" />
      <A d={d} k={show([[54, 94]])} className="demo-small" style={{ left: 14, top: 30 }}>50%</A>
      <A d={d} k={show([[54, 94]])} className="demo-small" style={{ right: 2, top: 30 }}>50%</A>
    </Scene>
  )
}


function TidyUpDemo() {
  const d = 3.8
  // Three things glide from the mess into their outlines, one after another; then the lid shuts.
  const things: [string, number, number, number, number, number][] = [
    // class, slot x, from dx, from dy, arrives at %, turn
    ['demo-tu-coin', 50, -36, 26, 24, 0],
    ['demo-tu-bar', 78, 22, 30, 44, 90],
    ['demo-tu-tri', 106, -8, 30, 64, 0],
  ]
  return (
    <Scene still={3.3}>
      <span className="demo-tu-tray" />
      {things.map(([cls, x, , , , ]) => <span key={cls + 's'} className={`${cls} demo-tu-slot`} style={{ left: x - 10, top: 16 }} />)}
      {things.map(([cls, x, dx, dy, at, turn]) => (
        <A key={cls} d={d} className={cls} ease="cubic-bezier(.3,1.4,.5,1)" style={{ left: x - 10, top: 16 }}
          k={`0%,${at - 16}%{transform:translate(${dx}px,${dy}px) rotate(${turn}deg)}${at - 4}%{transform:translate(0,0) rotate(0deg)}${at}%{transform:scale(1.15)}${at + 4}%,100%{transform:none}`} />
      ))}
      <A d={d} className="demo-tu-lid" ease="cubic-bezier(.5,0,.3,1.25)" k="0%,74%{transform:scaleY(0)}84%,96%{transform:scaleY(1)}100%{transform:scaleY(0)}" />
    </Scene>
  )
}


function DominoDropDemo() {
  const d = 3.8
  // A gentle arc of dominoes with one gap; a spare drops into the gap, then the push runs through.
  const xs = [14, 28, 42, 56, 84, 98, 112, 126]
  const spareX = 70
  const y = (x: number) => 46 - Math.sin((x / 140) * Math.PI) * 18
  const at = (x: number) => 30 + (x - 14) * 0.38 // falls one after another, left to right
  const domino = (x: number, spare = false) => (
    <A key={x} d={d} className={`demo-dd${spare ? ' demo-dd--spare' : ''}`} style={{ left: x - 2, top: y(x) - 7 }}
      k={`0%,${at(x)}%{width:4px;background:var(--paper)}${at(x) + 5}%,95%{width:12px;background:var(--line)}100%{width:4px;background:var(--paper)}`} />
  )
  return (
    <Scene still={3.4}>
      {xs.map((x) => domino(x))}
      <A d={d} k={show([[14, 100]])} style={{ position: 'absolute', inset: 0 }}>{domino(spareX, true)}</A>
      <Tap d={d} at={12} x={spareX} y={y(spareX)} />
    </Scene>
  )
}


function OddPickDemo() {
  const d = 3.6
  const shares = [70, 48, 14, 56, 40] // the tapped one (index 2) ends up the shortest
  return (
    <Scene still={3}>
      {shares.map((h, i) => (
        <span key={i}>
          <A d={d} className="demo-op-tile" style={{ left: 8 + i * 26 }} k={i === 2 ? '0%,20%{background:var(--paper)}22%,96%{background:var(--line)}100%{background:var(--paper)}' : '0%,100%{background:var(--paper)}'} />
          <A d={d} className="demo-op-bar" style={{ left: 12 + i * 26 }} ease="cubic-bezier(.2,.8,.3,1)" k={`0%,40%{height:0}${60 + i * 3}%,96%{height:${h * 0.5}px}100%{height:0}`} />
        </span>
      ))}
      <Tap d={d} at={20} x={8 + 2 * 26 + 11} y={62} />
      <A d={d} k={show([[74, 96]])} className="demo-small" style={{ left: 2, top: 2 }}>Rarest!</A>
    </Scene>
  )
}


function GuessTheCrowdDemo() {
  const d = 3.6
  const bins = [6, 12, 22, 34, 44, 40, 30, 20, 12, 6]
  return (
    <Scene still={3}>
      {bins.map((h, i) => (
        <A key={i} d={d} className="demo-gc-bar" style={{ left: 10 + i * 12 }} ease="cubic-bezier(.2,.8,.3,1)"
          k={`0%,${8 + i * 3}%{height:0}${30 + i * 3}%,96%{height:${h}px}100%{height:0}`} />
      ))}
      <A d={d} className="demo-gc-mark" ease="cubic-bezier(.3,1.3,.5,1)" k="0%,55%{transform:translateX(100px);opacity:0}58%{opacity:1}78%,96%{transform:translateX(52px);opacity:1}100%{opacity:0}" />
      <A d={d} k={show([[78, 96]])} className="demo-small" style={{ left: 46, top: 0 }}>Average</A>
    </Scene>
  )
}


function BeatKeeperDemo() {
  const d = 4
  const beats = [0, 1, 2, 3]
  return (
    <Scene still={3.4}>
      {/* The beat: four pulses, then it goes quiet. */}
      <A d={d} className="demo-bk-dot" k={`${beats.map((b) => `${b * 11}%{transform:scale(1.25)}${b * 11 + 4}%{transform:scale(.9)}`).join('')}46%,96%{transform:scale(.8);opacity:.35}100%{transform:scale(.9);opacity:1}`} />
      {/* The silent beats as marks; taps land on them one by one. */}
      {beats.map((b) => <span key={b} className="demo-bk-tick" style={{ left: 64 + b * 18 }} />)}
      {beats.map((b) => (
        <A key={b} d={d} className="demo-bk-tap" style={{ left: 64 + b * 18 + [2, -1, 3, 0][b] }} ease="ease-out"
          k={`0%,${50 + b * 10}%{opacity:0;transform:translateY(-10px)}${53 + b * 10}%,96%{opacity:1;transform:none}100%{opacity:0}`} />
      ))}
      <A d={d} k={show([[90, 98]])} className="demo-small" style={{ left: 60, top: 6 }}>±8 ms</A>
    </Scene>
  )
}


function PipeTurnDemo() {
  const d = 3.6
  // Three pipes in a row; the middle one is turned the wrong way, a tap turns it, water runs through to the plant.
  const pipe = (x: number, wetAt: number, turnIt = false) => (
    <A key={x} d={d} className="demo-pt-cell" style={{ left: x }} k={turnIt ? '0%,22%{transform:rotate(90deg)}30%,100%{transform:rotate(0deg)}' : '0%,100%{transform:none}'}>
      <A d={d} className="demo-pt-pipe" k={`0%,${wetAt}%{background:var(--paper)}${wetAt + 4}%,94%{background:var(--line)}100%{background:var(--paper)}`} />
    </A>
  )
  return (
    <Scene still={3}>
      <span className="demo-pt-tap" />
      {pipe(26, 0)}
      {pipe(54, 36, true)}
      {pipe(82, 46)}
      <Tap d={d} at={22} x={68} y={40} />
      <A d={d} className="demo-pt-plant" k="0%,56%{transform:scale(.7)}64%{transform:scale(1.3)}70%,94%{transform:scale(1)}100%{transform:scale(.7)}" />
    </Scene>
  )
}


function LightPathDemo() {
  const d = 3.6
  return (
    <Scene still={3}>
      <span className="demo-lp-laser" />
      <span className="demo-lp-target" style={{ left: 96, top: 6 }} />
      <A d={d} className="demo-lp-mirror" ease="cubic-bezier(.3,1.5,.5,1)" k="0%,18%{transform:rotate(-45deg) scale(0)}26%,96%{transform:rotate(-45deg) scale(1)}100%{transform:rotate(-45deg) scale(0)}" />
      <A d={d} className="demo-lp-beam demo-lp-beam--a" k="0%,4%{width:0}16%,96%{width:76px}100%{width:0}" />
      <A d={d} className="demo-lp-beam demo-lp-beam--b" k="0%,28%{height:0}44%,96%{height:44px}100%{height:0}" />
      <A d={d} className="demo-lp-target demo-lp-target--lit" style={{ left: 96, top: 6 }} k={show([[44, 96]])} />
      <Tap d={d} at={20} x={102} y={58} />
    </Scene>
  )
}


function PendulumStopDemo() {
  const d = 3.4
  return (
    <Scene still={2.6}>
      <span className="demo-ps-track" />
      <A d={d} className="demo-ps-zone" k="0%,58%{background:var(--paper)}60%,70%{background:var(--line)}72%,100%{background:var(--paper)}" />
      <A d={d} className="demo-ps-rod" ease="ease-in-out" k="0%{transform:rotate(55deg)}18%{transform:rotate(-55deg)}36%{transform:rotate(55deg)}58%,92%{transform:rotate(-12deg)}100%{transform:rotate(55deg)}">
        <span className="demo-ps-bob" />
      </A>
      <Tap d={d} at={58} x={102} y={62} />
    </Scene>
  )
}


const SL_PATH = 'M16 62 C 40 62, 44 18, 70 22 S 104 58, 126 14'
function SteadyLineDemo() {
  const d = 3.6
  return (
    <Scene still={3}>
      <svg className="demo-sl" viewBox="0 0 140 72" aria-hidden="true">
        <path d={SL_PATH} className="demo-sl-wall" />
        <path d={SL_PATH} className="demo-sl-floor" />
      </svg>
      <A d={d} className="demo-sl-trace-wrap" k="0%{opacity:1}100%{opacity:1}">
        <svg className="demo-sl" viewBox="0 0 140 72" aria-hidden="true">
          <path d={SL_PATH} className="demo-sl-trace" pathLength={100} />
        </svg>
      </A>
      <span className="demo-small" style={{ left: 118, top: 0 }}>🏁</span>
    </Scene>
  )
}


const SR_SHAPE = 'M20 50 L44 16 L66 52 L92 14 L118 48'
function ShapeRecallDemo() {
  const d = 4
  return (
    <Scene still={3.5}>
      <A d={d} k={show([[4, 34], [70, 96]])} className="demo-sr-shape">
        <svg viewBox="0 0 140 72" aria-hidden="true"><path d={SR_SHAPE} className="demo-sr-edge" /><path d={SR_SHAPE} className="demo-sr-fill" /></svg>
      </A>
      <A d={d} className="demo-sr-shape" k={show([[36, 96]])}>
        <svg viewBox="0 0 140 72" aria-hidden="true"><path d="M22 54 L45 20 L64 54 L90 18 L116 50" className="demo-sr-ink" pathLength={100} /></svg>
      </A>
      <A d={d} k={show([[72, 96]])} className="demo-small" style={{ right: 0, top: 0 }}>91%</A>
    </Scene>
  )
}


function HigherLowerDemo() {
  const d = 3.6
  return (
    <Scene still={2.8}>
      <span className="demo-box demo-hl-card" style={{ left: 8, top: 10 }}><span className="demo-hl-bar" style={{ height: 22 }} /></span>
      <span className="demo-box demo-hl-card" style={{ left: 52, top: 10 }}>
        <A d={d} k={show([[0, 46], [96, 100]])} className="demo-text" style={{ fontSize: 18 }}>?</A>
        <A d={d} k={show([[46, 96]])} className="demo-hl-bar" style={{ height: 34 }} />
      </span>
      <A d={d} k="0%,18%{transform:scale(1)}22%{transform:scale(.9)}28%,100%{transform:scale(1)}" className="demo-box demo-hl-btn" style={{ left: 98, top: 12 }}>
        <span className="demo-text" style={{ fontSize: 12 }}>▲</span>
      </A>
      <Tap d={d} at={20} x={113} y={24} />
      <A d={d} k={show([[52, 92]])} className="demo-chip" style={{ left: 96, top: 44, background: 'var(--coral)', width: 36 }}>
        <span className="demo-text" style={{ fontSize: 9 }}>+3</span>
      </A>
    </Scene>
  )
}


// A cat's face drawn stroke by stroke: head, ears, eyes, whiskers.
const QD_STROKES = ['M34 40 a20 18 0 1 0 40 0 a20 18 0 1 0 -40 0', 'M38 30 L36 14 L48 24', 'M70 30 L72 14 L60 24', 'M46 38 h2 M60 38 h2', 'M54 46 l-3 3 h6 z', 'M40 48 h-14 M40 52 l-13 4 M68 48 h14 M68 52 l13 4']
function QuickDrawDemo() {
  const d = 4
  return (
    <Scene still={3.4}>
      <svg className="demo-qd" viewBox="0 0 140 72" aria-hidden="true">
        {QD_STROKES.map((p, i) => <path key={i} d={p} pathLength={100} style={{ animationDelay: `${i * 0.3}s` }} />)}
      </svg>
      <A d={d} k={show([[70, 96]])} className="demo-box demo-qd-bubble" style={{ left: 94, top: 22 }}>
        <span className="demo-text" style={{ fontSize: 10 }}>Cat ✓</span>
      </A>
    </Scene>
  )
}

function PaintMixDemo() {
  const d = 4.4
  // Two yellow drops fall into a blue bowl; it swirls to green and matches the target.
  const drop = (at: number) => `0%,${at - 9}%{opacity:0;transform:translateY(-22px)}${at - 8}%{opacity:1;transform:translateY(-22px)}${at}%{opacity:1;transform:translateY(14px) scale(.8)}${at + 1}%,100%{opacity:0;transform:translateY(14px)}`
  return (
    <Scene still={4.2}>
      <span className="demo-pm-disc" style={{ left: 6, top: 18, background: '#8fbf68' }} />
      <A d={d} className="demo-pm-disc" style={{ left: 80, top: 18 }} ease="ease-in-out" k="0%,26%{background:#4f86d6}40%,58%{background:#6fa59e}72%,100%{background:#8fbf68}" />
      <A d={d} className="demo-pm-swirl" style={{ left: 80, top: 18 }} ease="ease-out" k="0%,24%{opacity:0;transform:rotate(0)}28%{opacity:.9}42%{opacity:0;transform:rotate(300deg)}54%{opacity:0;transform:rotate(0)}58%{opacity:.9}72%,100%{opacity:0;transform:rotate(300deg)}" />
      <A d={d} className="demo-pm-drop" style={{ left: 97, top: 6 }} ease="ease-in" k={drop(26)} />
      <A d={d} className="demo-pm-drop" style={{ left: 97, top: 6 }} ease="ease-in" k={drop(56)} />
      <A d={d} className="demo-small" style={{ left: 106, top: 50 }} k={show([[76, 100]])}>✓</A>
    </Scene>
  )
}

/** Orbit Drop: the ball circles one planet, lets go, flies straight and is caught by the next. */
const OD_PATH = (() => {
  const A = { x: 34, y: 46, R: 22 }, Bp = { x: 108, y: 22, R: 17 }
  const stops: string[] = []
  const at = (pct: number, x: number, y: number) => stops.push(`${pct.toFixed(1)}%{transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px)}`)
  // Around A (anticlockwise on screen) from the bottom, 1.25 turns, ending where the tangent aims at B.
  const end = -Math.PI * 0.62
  const start = end + Math.PI * 2.5
  for (let i = 0; i <= 20; i++) { const a = start + ((end - start) * i) / 20; at((i / 20) * 46, A.x + Math.cos(a) * A.R, A.y + Math.sin(a) * A.R) }
  // Straight flight to B's ring, then around B.
  const sx = A.x + Math.cos(end) * A.R, sy = A.y + Math.sin(end) * A.R
  const entry = Math.atan2(sy - Bp.y, sx - Bp.x) + 0.9
  at(58, Bp.x + Math.cos(entry) * Bp.R, Bp.y + Math.sin(entry) * Bp.R)
  for (let i = 1; i <= 10; i++) { const a = entry - (i / 10) * Math.PI * 1.4; at(58 + i * 4.2, Bp.x + Math.cos(a) * Bp.R, Bp.y + Math.sin(a) * Bp.R) }
  return stops.join('')
})()
function OrbitDropDemo() {
  const d = 4.2
  return (
    <Scene still={2.15}>
      <span className="demo-od-ring" style={{ left: 12, top: 24, width: 44, height: 44 }} />
      <span className="demo-od-planet" style={{ left: 24, top: 36, width: 20, height: 20 }} />
      <span className="demo-od-ring demo-od-ring--next" style={{ left: 91, top: 5, width: 34, height: 34 }} />
      <span className="demo-od-planet demo-od-planet--next" style={{ left: 100, top: 14, width: 16, height: 16 }} />
      <A d={d} className="demo-od-flash" style={{ left: 91, top: 5, width: 34, height: 34 }} ease="ease-out" k="0%,57%{opacity:0;transform:scale(1)}58%{opacity:1;transform:scale(1)}70%,100%{opacity:0;transform:scale(1.6)}" />
      <A d={d} className="demo-od-ball" k={OD_PATH} />
    </Scene>
  )
}

/** Balance Beam: a tipped beam; a weight drops on the light side and it wobbles level. */
function BalanceBeamDemo() {
  const d = 4
  return (
    <Scene still={3.6}>
      <span className="demo-bb-pivot" />
      <A d={d} className="demo-bb-beam" ease="linear" k="0%,30%{transform:rotate(-12deg)}38%{transform:rotate(5deg)}46%{transform:rotate(-2.5deg)}54%{transform:rotate(1deg)}62%,100%{transform:rotate(0deg)}">
        {/* 3 at 26px from the pivot balances 2 at 39px: the card shows real balance. */}
        <span className="demo-bb-w demo-bb-w--fixed" style={{ left: 25, width: 18, height: 18 }}>3</span>
        <A d={d} className="demo-bb-w" style={{ left: 92, width: 15, height: 14 }} ease="ease-in" k="0%,14%{opacity:0;transform:translateY(-26px)}16%{opacity:1;transform:translateY(-26px)}30%,100%{opacity:1;transform:translateY(0)}">2</A>
      </A>
      <A d={d} className="demo-small" style={{ left: 52, top: 0 }} k={show([[62, 100]])}>Level</A>
    </Scene>
  )
}

/** Untangle Lights: two wires cross (red); one light slides over and the wire straightens out. */
function UntangleDemo() {
  const d = 4
  const move = '0%,20%{transform:translate(0,0)}50%,100%{transform:translate(-50px,50px)}'
  const wire = (x1: number, y1: number, x2: number, y2: number, bad = false) => (
    <svg className="demo-ul" viewBox="0 0 140 72" aria-hidden="true"><line x1={x1} y1={y1} x2={x2} y2={y2} className={bad ? 'demo-ul-wire demo-ul-wire--bad' : 'demo-ul-wire'} /></svg>
  )
  return (
    <Scene still={3.6}>
      {wire(20, 14, 120, 60)}
      <A d={d} className="demo-ul-layer" k={show([[0, 49]])}>{wire(120, 14, 20, 60, true)}</A>
      <A d={d} className="demo-ul-layer" k={show([[50, 100]])}>{wire(70, 64, 20, 60)}</A>
      {[[20, 14], [20, 60], [120, 60]].map(([x, y]) => <span key={`${x}${y}`} className="demo-ul-dot" style={{ left: x - 6, top: y - 6 }} />)}
      <A d={d} className="demo-ul-dot" style={{ left: 114, top: 8 }} ease="ease-in-out" k={move} />
      <A d={d} className="demo-small" style={{ left: 64, top: 22 }} k={show([[58, 100]])}>✓</A>
    </Scene>
  )
}

/** Tilt: the board tips right, the marble rolls to the wall, then down into its hole. */
function TiltDemo() {
  const d = 4
  const roll = '0%,15%{transform:translate(0,0)}35%,50%{transform:translate(78px,0)}62%{transform:translate(78px,26px) scale(1)}75%,100%{transform:translate(78px,26px) scale(.2);opacity:0}'
  return (
    <Scene still={1.4}>
      <span className="demo-tl-board" />
      <span className="demo-tl-block" style={{ left: 56, top: 38 }} />
      <span className="demo-tl-hole" style={{ left: 104, top: 38 }}>●</span>
      <A d={d} className="demo-tl-marble" style={{ left: 26, top: 12 }} ease="cubic-bezier(.45,0,.7,1)" k={roll}>●</A>
      <A d={d} className="demo-small" style={{ left: 64, top: 2 }} k={show([[16, 34]])}>→</A>
      <A d={d} className="demo-small" style={{ left: 64, top: 2 }} k={show([[51, 66]])}>↓</A>
      <A d={d} className="demo-small" style={{ left: 64, top: 2 }} k={show([[78, 100]])}>✓</A>
    </Scene>
  )
}

/** Sum Path: squares light up corner to corner while the total counts up to the target. */
const SP_DIGITS = [3, 7, 2, 5, 1, 4, 6, 2, 8, 3]
const SP_ROUTE = [0, 1, 6, 7, 8, 9]
function SumPathDemo() {
  const d = 4.4
  const at = (i: number) => ({ left: 6 + (i % 5) * 22, top: 12 + Math.floor(i / 5) * 26 })
  let total = 0
  return (
    <Scene still={4}>
      {SP_ROUTE.map((c, k) => <A key={`on${c}`} d={d} className="demo-sp-on" style={at(c)} k={show([[8 + k * 12, 100]])} />)}
      {SP_DIGITS.map((v, i) => <span key={i} className="demo-sp" style={{ ...at(i), background: 'transparent' }}>{v}</span>)}
      {SP_ROUTE.map((c, k) => { total += SP_DIGITS[c]; const t = total; return <A key={`t${c}`} d={d} className="demo-small" style={{ left: 118, top: 30, fontSize: 14 }} k={show([[8 + k * 12, k === SP_ROUTE.length - 1 ? 100 : 8 + (k + 1) * 12 - 0.2]])}>{t}</A> })}
    </Scene>
  )
}

/** Letter Race: seven tiles; a word builds up from them, then scores. */
function LetterRaceDemo() {
  const d = 4.4
  const tiles = ['r', 'a', 'g', 'd', 'e', 'n', 's']
  const word = ['g', 'a', 'r', 'd', 'e', 'n']
  return (
    <Scene still={3.6}>
      {word.map((c, i) => <A key={`w${i}`} d={d} className="demo-lr-letter" style={{ left: 22 + i * 16, top: 4 }} k={show([[8 + i * 9, 86]])}>{c}</A>)}
      <A d={d} className="demo-small" style={{ left: 120, top: 8 }} k={show([[64, 86]])}>+6</A>
      {tiles.map((c, i) => <span key={c} className="demo-lr-tile" style={{ left: 6 + i * 19, top: 38 }}>{c}</span>)}
    </Scene>
  )
}

/** Word Ladder: COLD → CORD → WORD → WARM, one letter changing each beat. */
function WordLadderDemo() {
  const d = 4.4
  const words: [string, number, number][] = [['cold', 0, 25], ['cord', 25, 50], ['word', 50, 75], ['warm', 75, 100]]
  return (
    <Scene still={4.2}>
      {words.map(([w, a, b], k) => (
        <A key={w} d={d} k={show([[a, b]])} className="demo-wl">
          {[...w].map((c, i) => <span key={i} className={k && c !== words[k - 1][0][i] ? 'demo-wl-tile is-new' : 'demo-wl-tile'}>{c}</span>)}
        </A>
      ))}
    </Scene>
  )
}

/** Garden Path: a line winds through a 4×3 garden from the seedling to the flower. */
const GP_ROUTE = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2]]
function GardenPathDemo() {
  const d = 4.4
  const pts = GP_ROUTE.map(([x, y]) => `${30 + x * 26},${10 + y * 26}`).join(' ')
  return (
    <Scene still={4}>
      <svg className="demo-gp" viewBox="0 0 140 72" aria-hidden="true">
        {GP_ROUTE.map(([x, y]) => <rect key={`${x}${y}`} x={17 + x * 26} y={-3 + y * 26} width={26} height={26} className="demo-gp-cell" />)}
        {/* A turn stone where the route turns (top right). */}
        <circle cx={30 + 78} cy={10} r={4} className="demo-gp-stone" />
        <polyline points={pts} pathLength={100} className="demo-gp-line" />
      </svg>
      <span className="demo-small" style={{ left: 24, top: 3 }}>🌱</span>
      <A d={d} className="demo-small" style={{ left: 102, top: 55 }} k={show([[80, 100]])}>🌼</A>
    </Scene>
  )
}

/** Rule Stack: a 3×3 corner of the grid fills in, a rule ticks, and a new rule slides in. */
function RuleStackDemo() {
  const d = 4.4
  const cells = ['#ff6a5c', '#5bbcff', '#3ed598', '#ffd166', '#ff6a5c', '#5bbcff', '#3ed598', '#ffd166', '#ff6a5c']
  return (
    <Scene still={2.6}>
      <span className="demo-rs-grid">
        {cells.map((c, i) => <A key={i} d={d} className="demo-rs-cell" k={`0%,${8 + i * 5}%{background:var(--paper)}${10 + i * 5}%,100%{background:${c}}`} />)}
      </span>
      <A d={d} className="demo-rs-rule" k={show([[0, 100]])}>✓ No two reds touch</A>
      <A d={d} className="demo-rs-rule demo-rs-rule--new" ease="ease-out" k="0%,70%{opacity:0;transform:translateY(-6px)}76%,100%{opacity:1;transform:none}">✗ Every row has a green</A>
    </Scene>
  )
}

/** Dots & Boxes: lines appear one by one around two boxes; the last line claims both. */
function DotsDemo() {
  const d = 4.4
  const X = [30, 62, 94], Y = [10, 42]
  // [from dot x, from dot y, across?, appears at %]
  const lines: [number, number, boolean, number][] = [[0, 0, true, 6], [2, 0, false, 16], [1, 1, true, 26], [0, 0, false, 36], [1, 0, true, 46], [0, 1, true, 56], [1, 0, false, 66]]
  return (
    <Scene still={4}>
      {[0, 1].map((b) => <A key={b} d={d} className="demo-db-box" style={{ left: X[b] + 3, top: Y[0] + 3 }} k={show([[67, 96]])} />)}
      {lines.map(([x, y, across, at], i) => (
        <A key={i} d={d} className={`demo-db-line${across ? ' is-across' : ''}`} style={{ left: X[x] - 2, top: Y[y] - 2 }} k={show([[at, 96]])} />
      ))}
      {X.flatMap((x) => Y.map((y) => <span key={`${x}${y}`} className="demo-db-dot" style={{ left: x - 4, top: y - 4 }} />))}
    </Scene>
  )
}

export const DEMOS: Record<string, () => ReactNode> = {
  'blind-timer': BlindTimerDemo,
  'reaction-chain': ReactionChainDemo,
  'odd-one-out': OddOneOutDemo,
  'memory-path': MemoryPathDemo,
  'pitch-match': PitchMatchDemo,
  'tap-duel': TapDuelDemo,
  'color-recall': ColorRecallDemo,
  'count-flash': CountFlashDemo,
  'tug-of-taps': TugDemo,
  'angle-eye': AngleEyeDemo,
  'reaction-online': ReactionOnlineDemo,
  'flip-grid': FlipGridDemo,
  'spot-race': SpotRaceDemo,
  'stack-tower': StackTowerDemo,
  'pour-line': PourLineDemo,
  'chain-pop': ChainPopDemo,
  'fair-slice': FairSliceDemo,
  'tidy-up': TidyUpDemo,
  'domino-drop': DominoDropDemo,
  'odd-pick': OddPickDemo,
  'guess-the-crowd': GuessTheCrowdDemo,
  'beat-keeper': BeatKeeperDemo,
  'pipe-turn': PipeTurnDemo,
  'light-path': LightPathDemo,
  'pendulum-stop': PendulumStopDemo,
  'steady-line': SteadyLineDemo,
  'shape-recall': ShapeRecallDemo,
  'paint-mix': PaintMixDemo,
  'orbit-drop': OrbitDropDemo,
  'balance-beam': BalanceBeamDemo,
  'untangle-lights': UntangleDemo,
  'word-ladder': WordLadderDemo,
  'garden-path': GardenPathDemo,
  'rule-stack': RuleStackDemo,
  'tilt': TiltDemo,
  'sum-path': SumPathDemo,
  'dots-and-boxes': DotsDemo,
  'higher-lower': HigherLowerDemo,
  'letter-race': LetterRaceDemo,
  'quick-draw': QuickDrawDemo,
}
