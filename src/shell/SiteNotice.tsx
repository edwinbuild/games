// Under the top bar: the admin's announcement (dismissible) and the maintenance note (not).
import { useState } from 'react'
import { bannerLive, useSiteConfig, type Banner } from './config'
import { load, save } from './storage'

function Note({ b, kind, onClose }: { b: NonNullable<Banner>; kind: 'banner' | 'maintenance'; onClose?: () => void }) {
  return (
    <div className={`site-notice site-notice--${kind}`} role={kind === 'maintenance' ? 'alert' : 'status'}>
      <span>{kind === 'maintenance' ? '🛠️ ' : '📣 '}{b.link ? <a href={b.link}>{b.text}</a> : b.text}</span>
      {onClose && <button type="button" className="site-notice-close" aria-label="Dismiss" onClick={onClose}>✕</button>}
    </div>
  )
}

export function SiteNotice() {
  const cfg = useSiteConfig()
  const [hidden, setHidden] = useState(() => load<string>('banner-dismissed', ''))
  const b = cfg.banner
  return (
    <>
      {bannerLive(cfg.maintenance) && <Note b={cfg.maintenance!} kind="maintenance" />}
      {bannerLive(b) && hidden !== b!.text && <Note b={b!} kind="banner" onClose={() => { save('banner-dismissed', b!.text); setHidden(b!.text) }} />}
    </>
  )
}
