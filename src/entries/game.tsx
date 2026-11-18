import { StrictMode, Suspense, lazy, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { getGame } from '../games/registry'
import { GameShell } from '../shell/GameShell'
import '../shell/styles.css'

// Each game lives in src/games/<slug>.tsx and is loaded only on its own page.
const modules = import.meta.glob<{ default: ComponentType }>('../games/*.tsx')

const slug = document.body.dataset.game!
const meta = getGame(slug)
const loader = modules[`../games/${slug}.tsx`]
if (!loader) throw new Error(`No component for game ${slug}`)
const Game = lazy(loader)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameShell game={meta}>
      <Suspense fallback={<div className="loading">Loading…</div>}>
        <Game />
      </Suspense>
    </GameShell>
  </StrictMode>,
)
