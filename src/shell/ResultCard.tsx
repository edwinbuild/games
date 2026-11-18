import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { GameMeta } from '../games/registry'
import { SITE } from '../site'
import { Countdown } from './Countdown'
import { PlayNext } from './PlayNext'
import { canNativeShare, copyText, nativeShare, shareUrls } from './share'
import { track } from './track'

type Props = {
  game: GameMeta
  /** The big number or phrase, e.g. "Off by 0.04s". */
  headline: string
  /** Smaller line under it: best score, streak, etc. */
  detail?: ReactNode
  /** Spoiler-free text that gets shared (emoji grid, score). The link is added automatically. */
  shareText: string
  /** Score games: replay button. */
  onReplay?: () => void
  replayLabel?: string
  /** Extra controls under the share buttons (e.g. "Practice"). */
  extra?: ReactNode
  /** Send a 'finish' event when shown. Off when re-showing an earlier result. */
  trackFinish?: boolean
  finishData?: Record<string, string | number>
}

export function ResultCard(p: Props) {
  const url = `${SITE.url}/${p.game.slug}/`
  const pageUrl = typeof location !== 'undefined' ? location.origin + location.pathname : url
  const shareLink = SITE.url.includes('example.com') ? pageUrl : url
  const [copied, setCopied] = useState(false)
  const tracked = useRef(false)

  useEffect(() => {
    if ((p.trackFinish ?? true) && !tracked.current) {
      tracked.current = true
      track('finish', p.game.slug, p.finishData)
    }
  }, [p.trackFinish, p.game.slug, p.finishData])

  const links = shareUrls(p.shareText, shareLink)
  const onShare = (via: string) => track('share', p.game.slug, { via })

  return (
    <section className="result" aria-live="polite">
      <p className="result-headline">{p.headline}</p>
      {p.detail && <div className="result-detail">{p.detail}</div>}

      <pre className="share-preview">{p.shareText}</pre>

      <div className="share-row">
        {canNativeShare() && (
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (await nativeShare(p.shareText, shareLink)) onShare('native')
            }}
          >
            Share
          </button>
        )}
        <a className="btn btn-wa" href={links.whatsapp} target="_blank" rel="noopener" onClick={() => onShare('whatsapp')}>
          WhatsApp
        </a>
        <a className="btn btn-x" href={links.x} target="_blank" rel="noopener" onClick={() => onShare('x')}>
          X
        </a>
        <button
          className="btn"
          onClick={async () => {
            if (await copyText(`${p.shareText}\n${shareLink}`)) {
              setCopied(true)
              onShare('copy')
              setTimeout(() => setCopied(false), 1800)
            }
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>

      {p.onReplay && (
        <button className="btn btn-big" onClick={p.onReplay}>
          {p.replayLabel ?? 'Play again'}
        </button>
      )}
      {p.game.daily && <Countdown />}
      {p.extra}

      <PlayNext current={p.game.slug} />

      {SITE.supportUrl && (
        <p className="support">
          Enjoying these? <a href={SITE.supportUrl} target="_blank" rel="noopener">Buy me a coffee ☕</a>
        </p>
      )}
    </section>
  )
}
