import { StrictMode } from 'react'
import { mount, ready } from '../shell/mount'
import { SITE } from '../site'
import { SiteFooter } from '../shell/SiteFooter'
import { AccountKey } from '../shell/AccountKey'
import { PrivacyTools } from '../shell/PrivacyTools'
import { TopBar } from '../ui'
import '../shell/styles'
import '../shell/errors'
import '../shell/sw-register'

// Static pages (About, Privacy, 404): the text is in the HTML; this adds the top bar, the footer
// and the privacy page's download and delete buttons.
mount(document.getElementById('root'),
  <StrictMode>
    <div className="page">
      <TopBar siteName={SITE.name} right={<AccountKey />} />
    </div>
  </StrictMode>,
)
mount(
  document.getElementById('footer'),
  <StrictMode>
    <div className="page">
      <SiteFooter />
    </div>
  </StrictMode>,
)
mount(document.getElementById('privacy-tools'), <StrictMode><PrivacyTools /></StrictMode>)
ready()
