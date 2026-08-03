'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock3, Download, LayoutGrid, Plus, Send } from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: typeof LayoutGrid
  match: (pathname: string) => boolean
}

const items: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid, match: pathname => pathname === '/dashboard' },
  { label: 'Send', href: '/upload', icon: Send, match: pathname => pathname.startsWith('/upload') },
  { label: 'Receive', href: '/receive-code', icon: Download, match: pathname => pathname.startsWith('/receive-code') || pathname.startsWith('/receive/') },
  { label: 'Activity', href: '/history', icon: Clock3, match: pathname => pathname.startsWith('/history') || pathname.startsWith('/file-analytics/') },
]

export default function AppBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bolt-bottom-nav" aria-label="Primary navigation">
      <div className="bolt-bottom-nav-inner">
        {items.slice(0, 2).map(item => {
          const Icon = item.icon
          const active = item.match(pathname)
          return (
            <Link key={item.label} href={item.href} className={`bolt-nav-item${active ? ' is-active' : ''}`}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <Link href="/upload" className="bolt-nav-create" aria-label="Create a new transfer">
          <Plus aria-hidden="true" />
        </Link>

        {items.slice(2).map(item => {
          const Icon = item.icon
          const active = item.match(pathname)
          return (
            <Link key={item.label} href={item.href} className={`bolt-nav-item${active ? ' is-active' : ''}`}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
