'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, ArrowRight, QrCode, Shield, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import AppBottomNav from '@/components/boltshare/AppBottomNav'
import { usePreferences } from '@/lib/PreferencesContext'

export default function ReceiveCodePage() {
  const { t } = usePreferences()
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const router                = useRouter()

  async function handleContinue() {
    const token = code.trim().toUpperCase()
    if (!token) { toast.error('Please enter a code'); return }

    setLoading(true)
    try {
      const response = await fetch(`/api/share/${encodeURIComponent(token)}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.files?.length) {
        toast.error(payload.error || 'Code not found. Check and try again.')
        return
      }
      router.push(`/receive/${token}`)
    } catch {
      toast.error('The share service is temporarily unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="bolt-page bolt-page-with-nav">
      <div className="bolt-page-shell premium-enter" style={{ display: 'grid', minHeight: 'calc(100svh - 8rem)', placeItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '2.5rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#000" fill="#000" />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--bs-text)' }}>{t('receive.receiver')}</span>
        </div>

        {/* Phones + Shield illustration */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            {/* Left phone */}
            <div style={{ width: '52px', height: '88px', borderRadius: '10px', background: 'var(--bs-surface)', border: '1.5px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '48px', borderRadius: '4px', background: 'var(--bs-surface-2)' }} />
            </div>

            {/* Shield center */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245,197,24,0.1)', border: '0.5px solid rgba(245,197,24,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 0 20px rgba(245,197,24,0.4))' }}>
                <Shield size={28} color="#F5C518" fill="rgba(245,197,24,0.2)" />
              </div>
              {/* Lightning bolts */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{ width: '20px', height: '1.5px', background: 'linear-gradient(90deg, transparent, #F5C518)', borderRadius: '2px' }} />
                <div style={{ width: '20px', height: '1.5px', background: 'linear-gradient(90deg, #F5C518, transparent)', borderRadius: '2px' }} />
              </div>
            </div>

            {/* Right phone */}
            <div style={{ width: '52px', height: '88px', borderRadius: '10px', background: 'var(--bs-surface)', border: '1.5px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '48px', borderRadius: '4px', background: 'var(--bs-surface-2)' }} />
            </div>
          </div>

          <h2 style={{ color: 'var(--bs-text)', fontWeight: 700, fontSize: '1.3rem', marginTop: '1.25rem' }}>{t('receive.title')}</h2>
          <p style={{ color: 'var(--bs-text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>{t('receive.subtitle')}</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bs-surface)', border: '0.5px solid var(--bs-border)', borderRadius: '20px', padding: '1.5rem' }}>

          <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--bs-text-2)', display: 'block', marginBottom: '8px' }}>
            {t('receive.enter')}
          </label>

          {/* Code input */}
          <input
            type="text"
            placeholder={t('receive.placeholder')}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
            maxLength={10}
            style={{
              width: '100%',
              background: 'var(--bs-surface-2)',
              border: '0.5px solid var(--bs-border-2)',
              borderRadius: '12px',
              color: 'var(--bs-text)',
              padding: '0.9rem 1rem',
              fontSize: '1.1rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              outline: 'none',
              marginBottom: '1rem',
              textAlign: 'center',
              fontFamily: 'monospace',
            }}
          />

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={loading}
            style={{ width: '100%', background: loading ? '#B8960F' : '#F5C518', color: '#000', border: 'none', borderRadius: '12px', padding: '0.9rem', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1rem' }}
          >
            {loading
              ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              : <><ArrowRight size={18} /> {t('receive.continue')}</>
            }
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--bs-border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--bs-text-dim)' }}>or</span>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--bs-border)' }} />
          </div>

          {/* QR button */}
          <button
            onClick={() => toast('QR scanner coming soon')}
            style={{ width: '100%', background: 'transparent', border: '0.5px solid var(--bs-border-2)', borderRadius: '12px', padding: '0.9rem', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--bs-text-2)' }}
          >
            <QrCode size={18} color="var(--bs-text-muted)" /> {t('receive.scan')}
          </button>
        </div>

        {/* App link */}
        <p style={{ textAlign: 'center', color: 'var(--bs-text-dim)', fontSize: '0.75rem', marginTop: '1.25rem' }}>
          Don&apos;t have the app yet?{' '}
          <a href="https://boltshare.rcinc.app" style={{ color: '#F5C518', textDecoration: 'none' }}>
            boltshare.rcinc.app
          </a>
        </p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
      <AppBottomNav />
    </main>
  )
}
