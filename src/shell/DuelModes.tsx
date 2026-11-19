import { Segmented } from '../ui'

/** Reaction Duel comes in two modes, each its own page: two players on this phone, or online. */
export function DuelModes({ current }: { current: 'phone' | 'online' }) {
  return (
    <div className="duel-modes">
      <Segmented
        label="How to play"
        value={current}
        options={[{ value: 'phone', label: 'One phone' }, { value: 'online', label: 'Online' }]}
        onChange={(v) => { if (v !== current) location.href = v === 'online' ? '/reaction-online/' : '/tap-duel/' }}
      />
    </div>
  )
}
