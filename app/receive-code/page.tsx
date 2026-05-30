'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, ArrowRight, QrCode, Shield, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ReceiveCodePage() {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const router                = useRouter()
  const supabase              = createClient()

  async function handleContinue() {
    const token = code.trim().toUpperCase()
    if (!token) { toast.error('Please enter a code'); return }

    setLoading(true)
    const { data } = await supabase
      .from('shared_files')
      .select('id, status, expires_at')
      .eq('share_token', token)
      .single()

    setLoading(false)

    if (!data) {
      toast.error('Code not found. Check and try again.')
      return
    }
    if (data.status !== 'active') {
      toast.error('This file has been removed.')
      return
    }
    if (new Date(data.expires_at) < new Date()) {
      toast.error('This link has expired.')
      return
    }
    router.push(`/receive/${token}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '2.5rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#000" fill="#000" />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>BoltShare Receiver</span>
        </div>

        {/* Phones + Shield illustration */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            {/* Left phone */}
            <div style={{ width: '52px', height: '88px', borderRadius: '10px', background: '#1A1A1A', border: '1.5px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '48px', borderRadius: '4px', background: '#242424' }} />
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
            <div style={{ width: '52px', height: '88px', borderRadius: '10px', background: '#1A1A1A', border: '1.5px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '48px', borderRadius: '4px', background: '#242424' }} />
            </div>
          </div>

          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.3rem', marginTop: '1.25rem' }}>Receive a File</h2>
          <p style={{ color: '#8A8A8A', fontSize: '0.85rem', marginTop: '4px' }}>Ask the sender for their code or QR</p>
        </div>

        {/* Card */}
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem' }}>

          <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#B0B0B0', display: 'block', marginBottom: '8px' }}>
            Enter Code
          </label>

          {/* Code input */}
          <input
            type="text"
            placeholder="e.g. ABC12345"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
            maxLength={10}
            style={{
              width: '100%',
              background: '#242424',
              border: '0.5px solid rgba(255,255,255,0.14)',
              borderRadius: '12px',
              color: '#fff',
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
              : <><ArrowRight size={18} /> Continue</>
            }
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '0.75rem', color: '#555' }}>or</span>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* QR button */}
          <button
            onClick={() => toast('QR scanner coming soon')}
            style={{ width: '100%', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '12px', padding: '0.9rem', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#B0B0B0' }}
          >
            <QrCode size={18} color="#8A8A8A" /> Scan QR Code
          </button>
        </div>

        {/* App link */}
        <p style={{ textAlign: 'center', color: '#555', fontSize: '0.75rem', marginTop: '1.25rem' }}>
          Don't have the app yet?{' '}
          <a href="https://boltshare.rcinc.app" style={{ color: '#F5C518', textDecoration: 'none' }}>
            boltshare.rcinc.app
          </a>
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}