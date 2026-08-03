import type { ReactNode } from 'react'
import AppBottomNav from './AppBottomNav'

type PageShellProps = {
  children: ReactNode
  withNav?: boolean
  className?: string
}

export default function PageShell({ children, withNav = true, className = '' }: PageShellProps) {
  return (
    <main className={`bolt-page${withNav ? ' bolt-page-with-nav' : ''}${className ? ` ${className}` : ''}`}>
      <div className="bolt-page-shell">{children}</div>
      {withNav ? <AppBottomNav /> : null}
    </main>
  )
}
