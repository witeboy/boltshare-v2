'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock3, Download, LayoutGrid, Plus, Send } from 'lucide-react'
import { usePreferences } from '@/lib/PreferencesContext'

type NavItem = {
  labelKey: string
  href: string
  icon: typeof LayoutGrid
  match: (pathname: string) => boolean
}

const items: NavItem[] = [
  { labelKey: 'nav.dashboard', href: '/dashboard', icon: LayoutGrid, match: pathname => pathname === '/dashboard' },
  { labelKey: 'nav.send', href: '/upload', icon: Send, match: pathname => pathname.startsWith('/upload') },
  { labelKey: 'nav.receive', href: '/receive-code', icon: Download, match: pathname => pathname.startsWith('/receive-code') || pathname.startsWith('/receive/') },
  { labelKey: 'nav.activity', href: '/history', icon: Clock3, match: pathname => pathname.startsWith('/history') || pathname.startsWith('/file-analytics/') },
]

export default function AppBottomNav() {
  const pathname = usePathname()
  const { t } = usePreferences()

  return (
    <nav className="bolt-bottom-nav" aria-label="Primary navigation">
      <div className="bolt-bottom-nav-inner">
        {items.slice(0, 2).map(item => {
          const Icon = item.icon
          const active = item.match(pathname)
          return (
            <Link key={item.labelKey} href={item.href} className={`bolt-nav-item${active ? ' is-active' : ''}`}>
              <Icon aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </Link>
          )
        })}

        <Link href="/upload" className="bolt-nav-create" aria-label={t('dashboard.sendFile')}>
          <Plus aria-hidden="true" />
        </Link>

        {items.slice(2).map(item => {
          const Icon = item.icon
          const active = item.match(pathname)
          return (
            <Link key={item.labelKey} href={item.href} className={`bolt-nav-item${active ? ' is-active' : ''}`}>
              <Icon aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
