import { SITE } from '../site'
import { Footer } from '../ui/components'
import { ThemeSwitch } from './ThemeSwitch'

export const FOOTER_LINKS = [
  { label: 'All games', href: '/' },
  { label: 'Archive', href: '/archive/' },
  { label: 'About', href: '/about/' },
  { label: 'Privacy', href: '/privacy/' },
]
export const CREDIT = { label: 'edwinsm.me', href: 'https://edwinsm.me' }

export function SiteFooter() {
  return <Footer siteName={SITE.name} links={FOOTER_LINKS} credit={CREDIT} note={<ThemeSwitch />} />
}
