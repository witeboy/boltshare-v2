'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check, ChevronRight, Clock, Download, Globe, HelpCircle, Info, Loader2,
  LogOut, Mail, Moon, Save, Sun, Trash2, UserRound, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import AppBottomNav from '@/components/boltshare/AppBottomNav'
import { TRANSFER_TTL_HOURS } from '@/lib/config'
import { useAuth } from '@/lib/AuthContext'
import { appLanguages, usePreferences } from '@/lib/PreferencesContext'
import { getUserName } from '@/lib/user-profile'

export default function SettingsPage() {
  const { user, isAuthenticated, logout, updateProfileName } = useAuth()
  const { language, setLanguage, setTheme, t, theme } = usePreferences()
  const router = useRouter()
  const [defaultMaxDownloads, setDefaultMaxDownloads] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedName = getUserName(user)
      setFirstName(storedName.firstName)
      setLastName(storedName.lastName)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [user])

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
    router.push('/')
  }

  async function handleDeleteAccount() {
    if (deleteText !== 'DELETE') return
    setDeleting(true)
    try {
      const response = await fetch('/api/delete-account', { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Account deletion failed')
      await logout()
      toast.success('Account deleted successfully')
      router.push('/')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete account. Please try again.')
      setDeleting(false)
    }
  }

  async function handleSaveProfile() {
    if (!firstName.trim() || !lastName.trim() || savingProfile) return
    setSavingProfile(true)
    try {
      await updateProfileName(firstName, lastName)
      toast.success(t('profile.saved'))
    } catch (error) {
      console.error('Unable to save BoltShare profile name:', error)
      toast.error(t('profile.saveError'))
    } finally {
      setSavingProfile(false)
    }
  }

  const supportLinks = [
    { icon: Users, label: t('settings.team'), href: '/team' },
    { icon: HelpCircle, label: t('settings.help'), href: 'mailto:support@rcinc.app' },
    { icon: Mail, label: t('settings.contact'), href: 'mailto:support@rcinc.app' },
  ]
  const deletionItems = ['settings.delete1', 'settings.delete2', 'settings.delete3', 'settings.delete4', 'settings.delete5']

  return (
    <main className="bolt-page bolt-page-with-nav">
      <div className="bolt-page-shell bolt-settings-shell premium-enter">
        <header className="bolt-settings-header">
          <h1>{t('settings.title')}</h1>
          <p>{t('settings.subtitle')}</p>
        </header>

        {isAuthenticated && user ? (
          <section className="bolt-settings-account" aria-label={t('settings.account')}>
            <span className="bolt-settings-avatar">{(firstName || user.email)?.[0]?.toUpperCase()}</span>
            <span className="bolt-settings-account-copy">
              <strong>{firstName ? `${firstName} ${lastName}`.trim() : user.email}</strong>
              <small>{firstName ? user.email : t('settings.freePlan')}</small>
            </span>
          </section>
        ) : null}

        {isAuthenticated && user ? (
          <section className="bolt-settings-section" aria-labelledby="profile-heading">
            <div className="bolt-settings-section-heading">
              <span className="bolt-settings-heading-icon"><UserRound aria-hidden="true" /></span>
              <span><strong id="profile-heading">{t('profile.settingsTitle')}</strong><small>{t('profile.settingsHelp')}</small></span>
            </div>
            <div className="bolt-settings-profile-form">
              <label>
                <span>{t('profile.firstName')}</span>
                <input value={firstName} onChange={event => setFirstName(event.target.value)} maxLength={50} autoComplete="given-name" />
              </label>
              <label>
                <span>{t('profile.lastName')}</span>
                <input value={lastName} onChange={event => setLastName(event.target.value)} maxLength={50} autoComplete="family-name" />
              </label>
              <button type="button" disabled={!firstName.trim() || !lastName.trim() || savingProfile} onClick={() => void handleSaveProfile()}>
                {savingProfile ? <Loader2 className="premium-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
                {savingProfile ? t('profile.saving') : t('profile.save')}
              </button>
            </div>
          </section>
        ) : null}

        <section className="bolt-settings-section" aria-labelledby="appearance-heading">
          <div className="bolt-settings-section-heading">
            <span className="bolt-settings-heading-icon"><Moon aria-hidden="true" /></span>
            <span><strong id="appearance-heading">{t('settings.appearance')}</strong><small>{t('settings.appearanceHelp')}</small></span>
          </div>
          <div className="bolt-theme-picker" role="group" aria-label={t('settings.appearance')}>
            <button type="button" className={theme === 'light' ? 'is-active' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
              <Sun aria-hidden="true" /><span>{t('settings.day')}</span>{theme === 'light' ? <Check aria-hidden="true" /> : null}
            </button>
            <button type="button" className={theme === 'dark' ? 'is-active' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
              <Moon aria-hidden="true" /><span>{t('settings.night')}</span>{theme === 'dark' ? <Check aria-hidden="true" /> : null}
            </button>
          </div>
        </section>

        <section className="bolt-settings-section" aria-labelledby="language-heading">
          <div className="bolt-settings-section-heading">
            <span className="bolt-settings-heading-icon"><Globe aria-hidden="true" /></span>
            <span><strong id="language-heading">{t('settings.language')}</strong><small>{t('settings.languageHelp')}</small></span>
          </div>
          <div className="bolt-language-grid" role="group" aria-label={t('settings.language')}>
            {appLanguages.map(item => (
              <button key={item.code} type="button" className={language === item.code ? 'is-active' : ''}
                aria-pressed={language === item.code} onClick={() => setLanguage(item.code)}>
                <span aria-hidden="true">{item.flag}</span><strong>{item.label}</strong>
                {language === item.code ? <Check aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </section>

        <section className="bolt-settings-section" aria-labelledby="transfer-heading">
          <div className="bolt-settings-section-heading compact">
            <span><strong id="transfer-heading">{t('settings.transfers')}</strong></span>
          </div>
          <div className="bolt-settings-list">
            <div className="bolt-settings-row">
              <Clock aria-hidden="true" /><span>{t('settings.expiry')}</span><strong>{TRANSFER_TTL_HOURS} {t('settings.hours')}</strong>
            </div>
            <label className="bolt-settings-row">
              <Download aria-hidden="true" /><span>{t('settings.maxDownloads')}</span>
              <select value={defaultMaxDownloads ?? ''} onChange={event => setDefaultMaxDownloads(event.target.value ? Number(event.target.value) : null)}>
                <option value="">{t('settings.unlimited')}</option>
                <option value={1}>1x</option><option value={5}>5x</option><option value={10}>10x</option><option value={25}>25x</option>
              </select>
            </label>
          </div>
        </section>

        <section className="bolt-settings-section" aria-labelledby="support-heading">
          <div className="bolt-settings-section-heading compact"><span><strong id="support-heading">{t('settings.support')}</strong></span></div>
          <div className="bolt-settings-list">
            {supportLinks.map(({ icon: Icon, label, href }) => (
              <a key={label} href={href} className="bolt-settings-row">
                <Icon aria-hidden="true" /><span>{label}</span><ChevronRight aria-hidden="true" />
              </a>
            ))}
            <div className="bolt-settings-row"><Info aria-hidden="true" /><span>{t('settings.about')}</span><small>{t('settings.version')}</small></div>
          </div>
        </section>

        {isAuthenticated ? (
          <section className="bolt-settings-section is-danger" aria-labelledby="danger-heading">
            <div className="bolt-settings-section-heading">
              <span className="bolt-settings-heading-icon"><Trash2 aria-hidden="true" /></span>
              <span><strong id="danger-heading">{t('settings.delete')}</strong><small>{t('settings.deleteDescription')}</small></span>
            </div>
            <div className="bolt-delete-summary">
              <strong>{t('settings.deleteList')}</strong>
              <ul>{deletionItems.map(item => <li key={item}>{t(item)}</li>)}</ul>
            </div>
            {!deleteConfirm ? (
              <button type="button" className="bolt-danger-button" onClick={() => setDeleteConfirm(true)}><Trash2 aria-hidden="true" />{t('settings.delete')}</button>
            ) : (
              <div className="bolt-delete-confirm">
                <label htmlFor="delete-confirmation">{t('settings.typeDelete')}</label>
                <input id="delete-confirmation" value={deleteText} onChange={event => setDeleteText(event.target.value)} placeholder="DELETE" autoComplete="off" />
                <div>
                  <button type="button" onClick={() => { setDeleteConfirm(false); setDeleteText('') }}>{t('settings.cancel')}</button>
                  <button type="button" className="is-danger" disabled={deleteText !== 'DELETE' || deleting} onClick={() => void handleDeleteAccount()}>
                    {deleting ? <Loader2 className="premium-spin" aria-hidden="true" /> : null}{deleting ? t('settings.deleting') : t('settings.confirmDelete')}
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : null}

        {isAuthenticated ? (
          <button type="button" className="bolt-logout-button" disabled={loggingOut} onClick={() => void handleLogout()}>
            {loggingOut ? <Loader2 className="premium-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}{t('settings.logout')}
          </button>
        ) : null}

        <a className="bolt-delete-email-link" href="mailto:support@rcinc.app?subject=Delete my BoltShare account">{t('settings.deleteEmail')}</a>
      </div>
      <AppBottomNav />
    </main>
  )
}
