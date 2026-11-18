import { Footer } from '../ui'
import { ThemeSwitch } from './ThemeSwitch'

export function SiteFooter() {
  return (
    <Footer
      links={[
        { label: 'All games', href: '/' },
        { label: 'About', href: '/about/' },
      ]}
      note={<ThemeSwitch />}
    />
  )
}
