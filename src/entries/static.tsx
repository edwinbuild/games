import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SITE } from '../site'
import { SiteFooter } from '../shell/SiteFooter'
import { TopBar } from '../ui'
import '../shell/styles'

// Static pages (About, 404): the text is in the HTML; this adds the top bar and the footer.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="page">
      <TopBar siteName={SITE.name} />
    </div>
  </StrictMode>,
)
const footer = document.getElementById('footer')
if (footer) {
  createRoot(footer).render(
    <StrictMode>
      <div className="page">
        <SiteFooter />
      </div>
    </StrictMode>,
  )
}
