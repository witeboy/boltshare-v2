'use client'

import { useEffect, useState } from 'react'
import { Loader2, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/AuthContext'
import { usePreferences } from '@/lib/PreferencesContext'
import { getUserName, hasDismissedNamePrompt, namePromptStorageKey } from '@/lib/user-profile'

export default function NameOnboardingDialog({ onSaved }: { onSaved: (firstName: string) => void }) {
  const { dismissNamePrompt, updateProfileName, user } = useAuth()
  const { t } = usePreferences()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    const timer = window.setTimeout(() => {
      const storedName = getUserName(user)
      setFirstName(storedName.firstName)
      setLastName(storedName.lastName)

      let locallyHandled = false
      try { locallyHandled = window.localStorage.getItem(namePromptStorageKey(user.id)) === 'handled' } catch {}
      setOpen(!storedName.firstName && !hasDismissedNamePrompt(user) && !locallyHandled)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [user])

  if (!open || !user) return null

  const rememberHandled = () => {
    try { window.localStorage.setItem(namePromptStorageKey(user.id), 'handled') } catch {}
  }

  const saveName = async () => {
    if (!firstName.trim() || !lastName.trim() || saving) return
    setSaving(true)
    try {
      await updateProfileName(firstName, lastName)
      rememberHandled()
      onSaved(firstName.trim())
      setOpen(false)
      toast.success(t('profile.saved'))
    } catch (error) {
      console.error('Unable to save BoltShare profile name:', error)
      toast.error(t('profile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const skip = async () => {
    if (saving) return
    rememberHandled()
    setOpen(false)
    try {
      await dismissNamePrompt()
    } catch (error) {
      console.error('Unable to persist the BoltShare name prompt preference:', error)
    }
  }

  return (
    <div className="bolt-profile-overlay" role="presentation">
      <section className="bolt-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
        <span className="bolt-profile-dialog-icon"><UserRound aria-hidden="true" /></span>
        <h2 id="profile-dialog-title">{t('profile.title')}</h2>
        <p>{t('profile.help')}</p>

        <div className="bolt-profile-fields">
          <label>
            <span>{t('profile.firstName')}</span>
            <input value={firstName} onChange={event => setFirstName(event.target.value)} maxLength={50} autoComplete="given-name" autoFocus />
          </label>
          <label>
            <span>{t('profile.lastName')}</span>
            <input value={lastName} onChange={event => setLastName(event.target.value)} maxLength={50} autoComplete="family-name" />
          </label>
        </div>

        <button type="button" className="bolt-profile-save" disabled={!firstName.trim() || !lastName.trim() || saving} onClick={() => void saveName()}>
          {saving ? <Loader2 className="premium-spin" aria-hidden="true" /> : null}
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
        <button type="button" className="bolt-profile-skip" disabled={saving} onClick={() => void skip()}>{t('profile.skip')}</button>
      </section>
    </div>
  )
}
