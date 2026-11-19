// The privacy page's two buttons: download everything this browser keeps for the site, or delete
// it all (and this device's board results and answer marks in the database).
import { useState } from 'react'
import { rpc } from './api'
import { load } from './storage'
import { Button } from '../ui'

const PREFIX = 'qg:'
function keys(store: Storage): string[] {
  try { return Array.from({ length: store.length }, (_, i) => store.key(i)!).filter((k) => k.startsWith(PREFIX)) } catch { return [] }
}

/** Everything this site keeps in this browser, as one object. */
export function myData(): Record<string, unknown> {
  const read = (store: Storage) => Object.fromEntries(keys(store).map((k) => { const v = store.getItem(k); try { return [k.slice(PREFIX.length), JSON.parse(v!)] } catch { return [k.slice(PREFIX.length), v] } }))
  return { savedOn: new Date().toISOString(), device: read(localStorage), thisTab: read(sessionStorage) }
}

export function PrivacyTools() {
  const [state, setState] = useState<'idle' | 'confirm' | 'working' | 'done' | 'failed'>('idle')
  function download() {
    const blob = new Blob([JSON.stringify(myData(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pocket-fair-my-data.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  async function wipe() {
    setState('working')
    const key = load<string>('board-key', '')
    try {
      if (/^[0-9a-f]{32}$/.test(key)) await rpc('forget_me', { p_key: key })
    } catch {
      setState('failed')
      return
    }
    for (const store of [localStorage, sessionStorage]) for (const k of keys(store)) store.removeItem(k)
    setState('done')
  }
  return (
    <div className="stack privacy-tools">
      <Button variant="secondary" onClick={download}>Download my data</Button>
      {state === 'idle' && <Button variant="ghost" onClick={() => setState('confirm')}>Delete everything</Button>}
      {state === 'confirm' && (
        <div className="stack">
          <p className="body-strong" style={{ margin: 0 }}>Delete your scores, streaks and settings on this device, and your board results in the database? This can't be undone.</p>
          <div className="row">
            <Button color="chili" onClick={wipe}>Yes, delete everything</Button>
            <Button variant="ghost" onClick={() => setState('idle')}>Keep it</Button>
          </div>
        </div>
      )}
      {state === 'working' && <p className="body muted" role="status" style={{ margin: 0 }}>Deleting…</p>}
      {state === 'done' && <p className="body-strong" role="status" style={{ margin: 0 }}>Done. Everything is deleted; the site will start fresh.</p>}
      {state === 'failed' && <p className="body-strong" role="status" style={{ margin: 0, color: 'var(--danger)' }}>Couldn’t reach the database, so nothing was deleted. Check your connection and try again.</p>}
    </div>
  )
}
