import { Footer } from '../ui'

export function SiteFooter() {
  return (
    <Footer
      links={[
        { label: 'All games', href: '/' },
        { label: 'About', href: '/about/' },
      ]}
    />
  )
}
