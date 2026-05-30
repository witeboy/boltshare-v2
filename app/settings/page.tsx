'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  Moon, Globe, Clock, Download, HelpCircle,
  Mail, Info, LogOut, Trash2, ChevronRight,
  Home, ArrowLeftRight, Users, Settings, Shield,
  Zap, AlertTriangle, Loader2
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

// ── Translations ───────────────────────────
const translations: Record<string, Record<string, string>> = {
  en: {
    settings:        'Settings',
    general:         'General',
    appearance:      'Appearance',
    dark:            'Dark',
    language:        'Language',
    defaultExpiry:   'Default Expiry',
    defaultMaxDl:    'Default Max Downloads',
    unlimited:       'Unlimited',
    support:         'Support',
    helpCenter:      'Help Center',
    contactUs:       'Contact Us',
    aboutBoltShare:  'About BoltShare',
    version:         'Version 2.0.0',
    dangerZone:      'Danger Zone',
    deleteAccount:   'Delete Account',
    deleteDesc:      'Permanently delete your account and all associated data.',
    logout:          'Logout',
    confirmDelete:   'Type DELETE to confirm',
    confirmBtn:      'Confirm Delete',
    cancel:          'Cancel',
    deleting:        'Deleting...',
    deleteWarning:   'This action is permanent and cannot be undone.',
    willDelete:      'The following will be permanently deleted:',
    d1: 'Your account and profile',
    d2: 'All files you have shared',
    d3: 'All download logs and analytics',
    d4: 'Your organization (if you are the sole owner)',
    d5: 'All active share links (recipients lose access immediately)',
    hours:           'hours',
    hour:            'hour',
    days:            'days',
  },
  fr: {
    settings:        'Paramètres',
    general:         'Général',
    appearance:      'Apparence',
    dark:            'Sombre',
    language:        'Langue',
    defaultExpiry:   'Expiration par défaut',
    defaultMaxDl:    'Téléchargements max',
    unlimited:       'Illimité',
    support:         'Assistance',
    helpCenter:      "Centre d'aide",
    contactUs:       "Contactez-nous",
    aboutBoltShare:  'À propos de BoltShare',
    version:         'Version 2.0.0',
    dangerZone:      'Zone dangereuse',
    deleteAccount:   'Supprimer le compte',
    deleteDesc:      'Supprimez définitivement votre compte et toutes les données associées.',
    logout:          'Déconnexion',
    confirmDelete:   'Tapez DELETE pour confirmer',
    confirmBtn:      'Confirmer la suppression',
    cancel:          'Annuler',
    deleting:        'Suppression...',
    deleteWarning:   'Cette action est permanente et irréversible.',
    willDelete:      'Les éléments suivants seront supprimés:',
    d1: 'Votre compte et profil',
    d2: 'Tous les fichiers partagés',
    d3: 'Tous les journaux et analyses',
    d4: 'Votre organisation (si vous êtes le seul propriétaire)',
    d5: 'Tous les liens de partage actifs',
    hours: 'heures', hour: 'heure', days: 'jours',
  },
  es: {
    settings:        'Configuración',
    general:         'General',
    appearance:      'Apariencia',
    dark:            'Oscuro',
    language:        'Idioma',
    defaultExpiry:   'Expiración predeterminada',
    defaultMaxDl:    'Descargas máximas',
    unlimited:       'Ilimitado',
    support:         'Soporte',
    helpCenter:      'Centro de ayuda',
    contactUs:       'Contáctenos',
    aboutBoltShare:  'Acerca de BoltShare',
    version:         'Versión 2.0.0',
    dangerZone:      'Zona peligrosa',
    deleteAccount:   'Eliminar cuenta',
    deleteDesc:      'Elimina permanentemente tu cuenta y todos los datos asociados.',
    logout:          'Cerrar sesión',
    confirmDelete:   'Escribe DELETE para confirmar',
    confirmBtn:      'Confirmar eliminación',
    cancel:          'Cancelar',
    deleting:        'Eliminando...',
    deleteWarning:   'Esta acción es permanente e irreversible.',
    willDelete:      'Lo siguiente se eliminará permanentemente:',
    d1: 'Tu cuenta y perfil',
    d2: 'Todos los archivos compartidos',
    d3: 'Todos los registros y análisis',
    d4: 'Tu organización (si eres el único propietario)',
    d5: 'Todos los enlaces de uso compartido activos',
    hours: 'horas', hour: 'hora', days: 'días',
  },
  pt: {
    settings:        'Configurações',
    general:         'Geral',
    appearance:      'Aparência',
    dark:            'Escuro',
    language:        'Idioma',
    defaultExpiry:   'Expiração padrão',
    defaultMaxDl:    'Downloads máximos',
    unlimited:       'Ilimitado',
    support:         'Suporte',
    helpCenter:      'Central de ajuda',
    contactUs:       'Fale conosco',
    aboutBoltShare:  'Sobre o BoltShare',
    version:         'Versão 2.0.0',
    dangerZone:      'Zona de perigo',
    deleteAccount:   'Excluir conta',
    deleteDesc:      'Exclua permanentemente sua conta e todos os dados associados.',
    logout:          'Sair',
    confirmDelete:   'Digite DELETE para confirmar',
    confirmBtn:      'Confirmar exclusão',
    cancel:          'Cancelar',
    deleting:        'Excluindo...',
    deleteWarning:   'Esta ação é permanente e não pode ser desfeita.',
    willDelete:      'O seguinte será excluído permanentemente:',
    d1: 'Sua conta e perfil',
    d2: 'Todos os arquivos compartilhados',
    d3: 'Todos os registros e análises',
    d4: 'Sua organização (se você for o único proprietário)',
    d5: 'Todos os links de compartilhamento ativos',
    hours: 'horas', hour: 'hora', days: 'dias',
  },
}

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
]

const expiryOptions = [
  { value: 1,   labelKey: '1 hour' },
  { value: 6,   labelKey: '6 hours' },
  { value: 24,  labelKey: '24 hours' },
  { value: 72,  labelKey: '3 days' },
  { value: 168, labelKey: '7 days' },
]

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuth()
  const router  = useRouter()
  const supabase = createClient()

  const [lang, setLang]               = useState('en')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [defaultExpiry, setDefaultExpiry]   = useState(24)
  const [defaultMaxDl, setDefaultMaxDl]     = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm]   = useState(false)
  const [deleteText, setDeleteText]         = useState('')
  const [deleting, setDeleting]             = useState(false)
  const [loggingOut, setLoggingOut]         = useState(false)

  const t = translations[lang] || translations.en

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    router.push('/login')
  }

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') return
    setDeleting(true)
    try {
      // Delete all user's files from Supabase
      if (user?.email) {
        const { data: files } = await supabase
          .from('shared_files')
          .select('id, bunny_path')
          .eq('sender_email', user.email)

        // Delete each file from Bunny
        for (const file of files || []) {
          if (file.bunny_path) {
            await fetch('/api/delete-from-bunny', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bunnyPath: file.bunny_path }),
            })
          }
        }

        // Delete all records from Supabase
        await supabase.from('shared_files').delete().eq('sender_email', user.email)
        await supabase.from('org_members').delete().eq('user_email', user.email)
        await supabase.from('download_logs').delete().eq('receiver_email', user.email)
      }

      // Delete the Supabase auth user
      await fetch('/api/delete-account', { method: 'POST' })

      await logout()
      toast.success('Account deleted successfully')
      router.push('/login')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete account. Please try again.')
      setDeleting(false)
    }
  }

  const selectedLang = languages.find(l => l.code === lang) || languages[0]

  const s = (val: number | null) => {
    if (!val) return t.unlimited
    if (val === 1)   return `1 ${t.hour}`
    if (val < 24)    return `${val} ${t.hours}`
    if (val === 24)  return `24 ${t.hours}`
    return `${val / 24} ${t.days}`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.25rem 0.5rem' }}>
        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.5rem' }}>{t.settings}</h2>
      </div>

      <div style={{ padding: '0 1.25rem' }}>

        {/* User info */}
        {isAuthenticated && user && (
          <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#000' }}>{user.email?.[0]?.toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              <div style={{ fontSize: '0.75rem', color: '#8A8A8A', marginTop: '2px' }}>Free Plan</div>
            </div>
          </div>
        )}

        {/* General */}
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{t.general}</div>
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', marginBottom: '1rem' }}>

          {/* Appearance */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
            <Moon size={16} color="#8A8A8A" style={{ marginRight: '10px', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.875rem', color: '#B0B0B0' }}>{t.appearance}</span>
            <span style={{ fontSize: '0.875rem', color: '#fff' }}>{t.dark}</span>
          </div>

          {/* Language */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowLangPicker(!showLangPicker)}
              style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
            >
              <Globe size={16} color="#8A8A8A" style={{ marginRight: '10px', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.875rem', color: '#B0B0B0' }}>{t.language}</span>
              <span style={{ fontSize: '0.875rem', color: '#fff', marginRight: '6px' }}>{selectedLang.flag} {selectedLang.label}</span>
              <ChevronRight size={14} color="#555" />
            </div>
            {showLangPicker && (
              <div style={{ background: '#242424', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                {languages.map(l => (
                  <div
                    key={l.code}
                    onClick={() => { setLang(l.code); setShowLangPicker(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem 0.75rem 2.5rem', cursor: 'pointer', background: lang === l.code ? 'rgba(245,197,24,0.08)' : 'transparent' }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{l.flag}</span>
                    <span style={{ fontSize: '0.875rem', color: lang === l.code ? '#F5C518' : '#B0B0B0', fontWeight: lang === l.code ? 600 : 400 }}>{l.label}</span>
                    {lang === l.code && <span style={{ marginLeft: 'auto', color: '#F5C518', fontSize: '0.8rem' }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Default Expiry */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
            <Clock size={16} color="#8A8A8A" style={{ marginRight: '10px', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.875rem', color: '#B0B0B0' }}>{t.defaultExpiry}</span>
            <select
              value={defaultExpiry}
              onChange={e => setDefaultExpiry(Number(e.target.value))}
              style={{ background: '#242424', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '8px', color: '#fff', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}
            >
              {expiryOptions.map(o => (
                <option key={o.value} value={o.value}>{o.labelKey}</option>
              ))}
            </select>
          </div>

          {/* Default Max Downloads */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem' }}>
            <Download size={16} color="#8A8A8A" style={{ marginRight: '10px', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.875rem', color: '#B0B0B0' }}>{t.defaultMaxDl}</span>
            <select
              value={defaultMaxDl ?? ''}
              onChange={e => setDefaultMaxDl(e.target.value ? Number(e.target.value) : null)}
              style={{ background: '#242424', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '8px', color: '#fff', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">{t.unlimited}</option>
              <option value={1}>1x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
              <option value={25}>25x</option>
            </select>
          </div>
        </div>

        {/* Support */}
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{t.support}</div>
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', marginBottom: '1rem' }}>
          {[
            { icon: HelpCircle, label: t.helpCenter,     href: 'mailto:support@rcinc.app' },
            { icon: Mail,       label: t.contactUs,       href: 'mailto:support@rcinc.app' },
          ].map(({ icon: Icon, label, href }, i, arr) => (
            <a key={label} href={href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
              <Icon size={16} color="#8A8A8A" style={{ marginRight: '10px', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.875rem', color: '#B0B0B0' }}>{label}</span>
              <ChevronRight size={14} color="#555" />
            </a>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem' }}>
            <Info size={16} color="#8A8A8A" style={{ marginRight: '10px', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.875rem', color: '#B0B0B0' }}>{t.aboutBoltShare}</span>
            <span style={{ fontSize: '0.8rem', color: '#555' }}>{t.version}</span>
          </div>
        </div>

        {/* Delete Account — Google Play compliant */}
        {isAuthenticated && (
          <>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#E24B4A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{t.dangerZone}</div>
            <div style={{ background: 'rgba(226,75,74,0.06)', border: '0.5px solid rgba(226,75,74,0.25)', borderRadius: '16px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                <Trash2 size={16} color="#E24B4A" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#E24B4A' }}>{t.deleteAccount}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8A8A8A', marginTop: '3px', lineHeight: 1.5 }}>{t.deleteDesc}</div>
                </div>
              </div>

              {/* What gets deleted list — required by Google Play */}
              <div style={{ background: 'rgba(226,75,74,0.06)', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#E24B4A', marginBottom: '6px' }}>{t.willDelete}</div>
                {[t.d1, t.d2, t.d3, t.d4, t.d5].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#8A8A8A', flexShrink: 0, marginTop: '6px' }} />
                    <span style={{ fontSize: '0.72rem', color: '#8A8A8A', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>

              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  style={{ width: '100%', background: 'rgba(226,75,74,0.15)', color: '#E24B4A', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: '10px', padding: '0.75rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Trash2 size={15} /> {t.deleteAccount}
                </button>
              ) : (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#E24B4A', textAlign: 'center', marginBottom: '8px', fontWeight: 500 }}>{t.confirmDelete}</p>
                  <input
                    type="text"
                    value={deleteText}
                    onChange={e => setDeleteText(e.target.value)}
                    placeholder="DELETE"
                    style={{ width: '100%', background: '#1A1A1A', border: '0.5px solid rgba(226,75,74,0.4)', borderRadius: '10px', color: '#fff', padding: '0.75rem 1rem', fontSize: '0.9rem', outline: 'none', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: '10px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setDeleteConfirm(false); setDeleteText('') }}
                      style={{ flex: 1, background: '#242424', color: '#B0B0B0', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer' }}
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteText !== 'DELETE' || deleting}
                      style={{ flex: 1, background: deleteText === 'DELETE' ? '#E24B4A' : 'rgba(226,75,74,0.2)', color: deleteText === 'DELETE' ? '#fff' : '#8A8A8A', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 600, fontSize: '0.875rem', cursor: deleteText === 'DELETE' ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      {deleting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> {t.deleting}</> : t.confirmBtn}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#555', textAlign: 'center', marginTop: '8px' }}>{t.deleteWarning}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Logout */}
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{ width: '100%', background: 'rgba(226,75,74,0.1)', color: '#E24B4A', border: '0.5px solid rgba(226,75,74,0.2)', borderRadius: '14px', padding: '1rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1rem' }}
          >
            {loggingOut ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <LogOut size={18} />}
            {t.logout}
          </button>
        )}

        {/* Public delete account link — for users not logged in / Google Play requirement */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <a href="mailto:support@rcinc.app?subject=Delete my BoltShare account" style={{ fontSize: '0.75rem', color: '#555', textDecoration: 'underline' }}>
            Request account deletion via email
          </a>
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0.6rem 0 0.8rem', zIndex: 50 }}>
        {[
          { icon: Home,           label: 'Home',      href: '/dashboard', active: false },
          { icon: ArrowLeftRight, label: 'Transfers', href: '/history',   active: false },
          { icon: Users,          label: 'Team',      href: '/team',      active: false },
          { icon: Settings,       label: 'Settings',  href: '/settings',  active: true  },
        ].map(({ icon: Icon, label, href, active }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', minWidth: '56px' }}>
            <Icon size={22} color={active ? '#F5C518' : '#555'} />
            <span style={{ fontSize: '0.65rem', color: active ? '#F5C518' : '#555', fontWeight: active ? 600 : 400 }}>{label}</span>
          </Link>
        ))}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}