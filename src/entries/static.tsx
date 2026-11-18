import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SITE } from '../site'
import { TopBar } from '../ui'
import '../shell/styles'

// Static pages (About, 404): the text is in the HTML; this only adds the top bar.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="page">
      <TopBar siteName={SITE.name} />
    </div>
  </StrictMode>,
)
