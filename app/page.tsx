'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap, Mail, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleLogin = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D0D0D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: '#F5C518',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 0 32px rgba(245,197,24,0.35)',
            }}
          >
            <Zap size={32} color="#000" fill="#000" />
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}
          >
            BoltShare
          </h1>
          <p style={{ color: '#8A8A8A', marginTop: '6px', fontSize: '0.9rem' }}>
            Secure file sharing, blazing fast
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#1A1A1A',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '1.75rem',
          }}
        >
          {!sent ? (
            <>
              <h2
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: '6px',
                }}
              >
                Sign in to BoltShare
              </h2>
              <p
                style={{
                  color: '#8A8A8A',
                  fontSize: '0.85rem',
                  marginBottom: '1.5rem',
                }}
              >
                Enter your email — we'll send you a magic link. No password needed.
              </p>

              {/* Email input */}
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Mail
                  size={16}
                  color="#8A8A8A"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  style={{
                    width: '100%',
                    background: '#242424',
                    border: '0.5px solid rgba(255,255,255,0.14)',
                    borderRadius: '10px',
                    color: '#fff',
                    padding: '0.85rem 1rem 0.85rem 2.75rem',
                    fontSize: '0.95rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Submit button */}
              <button
                onClick={handleLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#B8960F' : '#F5C518',
                  color: '#000',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.9rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.15s',
                }}
              >
                {loading ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    Send Magic Link <ArrowRight size={18} />
                  </>
                )}
              </button>
            </>
          ) : (
            /* Sent state */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(29,158,117,0.15)',
                  border: '0.5px solid rgba(29,158,117,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <Mail size={24} color="#1D9E75" />
              </div>
              <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '8px' }}>
                Check your email
              </h3>
              <p style={{ color: '#8A8A8A', fontSize: '0.875rem', lineHeight: 1.6 }}>
                We sent a magic link to <strong style={{ color: '#fff' }}>{email}</strong>.
                Click it to sign in — no password needed.
              </p>
              <button
                onClick={() => setSent(false)}
                style={{
                  marginTop: '1.25rem',
                  background: 'transparent',
                  border: 'none',
                  color: '#F5C518',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p
          style={{
            textAlign: 'center',
            color: '#555',
            fontSize: '0.75rem',
            marginTop: '1.5rem',
          }}
        >
          End-to-end encrypted · Bunny CDN · Virus scanned
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #F5C518 !important; }
      `}</style>
    </div>
  )
}