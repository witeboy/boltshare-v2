'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Globe2, Moon, Settings, Sun } from 'lucide-react'
import { appLanguages, usePreferences } from '@/lib/PreferencesContext'

export default function DashboardQuickControls() {
  const { language, setLanguage, setTheme, t, theme } = usePreferences()
  const [languageOpen, setLanguageOpen] = useState(false)
  const languageControl = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!languageOpen) return

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!languageControl.current?.contains(event.target as Node)) setLanguageOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLanguageOpen(false)
    }

    document.addEventListener('pointerdown', closeOnPointerDown)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [languageOpen])

  return (
    <div className="bolt-dashboard-toolbar" aria-label={t('dashboard.quickSettings')}>
      <button
        type="button"
        className="bolt-dashboard-tool"
        aria-label={theme === 'dark' ? t('dashboard.useDayMode') : t('dashboard.useNightMode')}
        title={theme === 'dark' ? t('dashboard.useDayMode') : t('dashboard.useNightMode')}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </button>

      <div className="bolt-language-control" ref={languageControl}>
        <button
          type="button"
          className="bolt-dashboard-tool"
          aria-label={t('settings.language')}
          aria-expanded={languageOpen}
          aria-haspopup="menu"
          title={t('settings.language')}
          onClick={() => setLanguageOpen(current => !current)}
        >
          <Globe2 aria-hidden="true" />
        </button>

        {languageOpen ? (
          <div className="bolt-language-menu" role="menu" aria-label={t('settings.language')}>
            {appLanguages.map(item => (
              <button
                key={item.code}
                type="button"
                role="menuitemradio"
                aria-checked={language === item.code}
                className={language === item.code ? 'is-active' : ''}
                onClick={() => {
                  setLanguage(item.code)
                  setLanguageOpen(false)
                }}
              >
                <span aria-hidden="true">{item.flag}</span>
                <strong>{item.label}</strong>
                {language === item.code ? <Check aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Link href="/settings" className="bolt-dashboard-tool" aria-label={t('settings.title')} title={t('settings.title')}>
        <Settings aria-hidden="true" />
      </Link>
    </div>
  )
}
