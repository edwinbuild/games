import { StrictMode, Suspense, lazy, useEffect, type ComponentType } from 'react'
import { mount, ready } from '../shell/mount'
import { getGame } from '../games/registry'
import { GameShell } from '../shell/GameShell'
import '../shell/styles'
import '../shell/errors'
import '../shell/sw-register'
import '../shell/heartbeat'

// Each game lives in src/games/<slug>.tsx and is loaded only on its own page.
const modules = import.meta.glob<{ default: ComponentType }>('../games/*.tsx')

const slug = document.body.dataset.game!
const meta = getGame(slug)
const loader = modules[`../games/${slug}.tsx`]
if (!loader) throw new Error(`No component for game ${slug}`)
const Game = lazy(loader)

// The game slides in once, when it first appears; later screens of the game just swap.
document.documentElement.setAttribute('data-entering', '')
function Entered() {
  useEffect(() => {
    const t = setTimeout(() => document.documentElement.removeAttribute('data-entering'), 700)
    return () => clearTimeout(t)
  }, [])
  return null
}

function Skeleton() {
  return (
    <div className="game-skeleton" role="status" aria-label="Loading the game">
      <div className="game-skeleton-stage" />
      <div className="game-skeleton-key" />
    </div>
  )
}

mount(document.getElementById('root'),
  <StrictMode>
    <GameShell game={meta}>
      <Suspense fallback={<Skeleton />}>
        <Game />
        <Entered />
      </Suspense>
    </GameShell>
  </StrictMode>,
)
ready()
