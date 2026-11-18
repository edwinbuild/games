import type { levelSetup } from './odd-grid'

/** One Odd One Out grid. `onPick` gets the tapped square's index. */
export function OddGrid({ setup, level, shake, onPick }: { setup: ReturnType<typeof levelSetup>; level: number; shake: number | null; onPick: (i: number) => void }) {
  return (
    <div key={level} className="grid grid-in" style={{ gridTemplateColumns: `repeat(${setup.size}, minmax(0, 1fr))`, gap: setup.size > 5 ? 4 : 'var(--space-2)', maxWidth: 'min(100%, 62dvh)', marginInline: 'auto' }}>
      {Array.from({ length: setup.size * setup.size }, (_, i) => (
        <button
          key={`${level}-${i}`}
          className="qg-cell"
          data-state={shake === i ? 'wrong' : undefined}
          onPointerDown={() => onPick(i)}
          onClick={(e) => e.detail === 0 && onPick(i)}
          aria-label={`Square ${i + 1}`}
          style={{ fontSize: `min(${Math.floor((40 / setup.size) * 1.6)}vw, ${Math.floor(220 / setup.size)}px)`, borderRadius: setup.size > 5 ? 'var(--radius-sm)' : undefined }}
        >
          {i === setup.oddIndex ? setup.odd : setup.common}
        </button>
      ))}
    </div>
  )
}
