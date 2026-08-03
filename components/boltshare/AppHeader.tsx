import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type AppHeaderProps = {
  title?: string
  backHref?: string
  rightSlot?: ReactNode
}

export default function AppHeader({ title = 'BoltShare', backHref, rightSlot }: AppHeaderProps) {
  return (
    <header className="bolt-app-header">
      <div className="bolt-app-header-side">
        {backHref ? (
          <Link href={backHref} className="bolt-icon-button" aria-label="Go back">
            <ArrowLeft aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div className="bolt-app-header-title">{title}</div>
      <div className="bolt-app-header-side bolt-app-header-side-right">{rightSlot}</div>
    </header>
  )
}
