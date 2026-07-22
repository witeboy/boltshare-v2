'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  EyeOff,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/AuthContext'
import { createClient } from '@/lib/supabase/client'

const OTP_LENGTH = 6
const RESEND_WAIT_SECONDS = 30

type AuthScreen = 'landing' | 'email' | 'otp'

function BoltBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="premium-brand" aria-label="BoltShare">
      <span className="premium-brand-mark" aria-hidden="true">
        <Zap size={compact ? 25 : 29} fill="currentColor" strokeWidth={2.5} />
      </span>
      <span>
        Bolt<span className="premium-brand-accent">Share</span>
      </span>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="premium-page" style={{ display: 'grid', placeItems: 'center' }}>
      <div className="premium-spinner" aria-label="Loading BoltShare" />
    </div>
  )
}

function maskEmail(value: string) {
  const [name, domain] = value.split('@')
  if (!name || !domain) return value

  const visibleStart = name.slice(0, Math.min(2, name.length))
  const hidden = '•'.repeat(Math.max(3, Math.min(6, name.length - visibleStart.length)))
  return `${visibleStart}${hidden}@${domain}`
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export default function OnboardingPage() {
  const { isAuthenticated, isLoadingAuth } = useAuth()
  const router = useRouter()
  const otpInputRef = useRef<HTMLInputElement>(null)

  const [screen, setScreen] = useState<AuthScreen>('landing')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isLoadingAuth, router])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasSeenWelcome = localStorage.getItem('bs_onboarded') === '1'
    if (hasSeenWelcome && !isLoadingAuth && !isAuthenticated) {
      queueMicrotask(() => setScreen('email'))
    }
  }, [isAuthenticated, isLoadingAuth])

  useEffect(() => {
    if (screen !== 'otp') return

    const timer = window.setTimeout(() => {
      otpInputRef.current?.focus()
    }, 160)

    return () => window.clearTimeout(timer)
  }, [screen])

  useEffect(() => {
    if (resendSeconds <= 0) return

    const interval = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [resendSeconds])

  const openEmailScreen = () => {
    localStorage.setItem('bs_onboarded', '1')
    setScreen('email')
  }

  const sendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (sending) return
    setSending(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) {
        toast.error(
          error.message.toLowerCase().includes('fetch')
            ? 'Sign-in is temporarily unavailable. Please try again shortly.'
            : error.message,
        )
        return
      }

      setEmail(normalizedEmail)
      setOtp('')
      setResendSeconds(RESEND_WAIT_SECONDS)
      setScreen('otp')
      localStorage.setItem('bs_onboarded', '1')
      toast.success('A secure code was sent to your email')
    } catch (error) {
      console.error('Unable to send BoltShare sign-in code:', error)
      toast.error('Sign-in is temporarily unavailable. Please try again shortly.')
    } finally {
      setSending(false)
    }
  }

  const verifyCode = async () => {
    const token = otp.replace(/\D/g, '')

    if (token.length !== OTP_LENGTH) {
      toast.error('Enter the complete six-digit code')
      return
    }

    if (verifying) return
    setVerifying(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: 'email',
      })

      if (error) {
        toast.error('That code is invalid or expired. Request a new code and try again.')
        return
      }

      toast.success('Signed in securely')
      router.replace('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('Unable to verify BoltShare sign-in code:', error)
      toast.error('The code could not be verified. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleOtpChange = (value: string) => {
    setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH))
  }

  if (isLoadingAuth) {
    return <LoadingScreen />
  }

  if (screen === 'landing') {
    return (
      <main className="premium-page">
        <div className="premium-shell premium-enter" style={{ display: 'flex', flexDirection: 'column' }}>
          <header style={{ paddingTop: '0.35rem' }}>
            <BoltBrand />
          </header>

          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="premium-hero-art" aria-hidden="true">
              <div className="premium-bolt-stage">
                <Zap className="premium-bolt-hero" size={92} fill="currentColor" strokeWidth={2.35} />
              </div>
            </div>

            <div style={{ marginTop: '-0.25rem' }}>
              <h1 className="premium-heading">
                Share files.
                <br />
                <span className="premium-gold">Not your data.</span>
              </h1>
              <p className="premium-copy">
                Secure, private file transfers with end-to-end protection, expiring access and complete control after you send.
              </p>
            </div>
          </section>

          <footer style={{ paddingTop: '1.7rem' }}>
            <button type="button" className="premium-primary-button" onClick={openEmailScreen}>
              Get started
              <ArrowRight size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1.05rem', color: '#73777c', fontSize: '0.72rem' }}>
              <ShieldCheck size={13} color="var(--bs-gold)" />
              <span>Private transfers. No file-content profiling. No data selling.</span>
            </div>
          </footer>
        </div>
      </main>
    )
  }

  if (screen === 'email') {
    return (
      <main className="premium-page">
        <div className="premium-shell premium-enter">
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px' }}>
            <button type="button" className="premium-icon-button" onClick={() => setScreen('landing')} aria-label="Back to welcome screen">
              <ArrowLeft size={20} />
            </button>
            <BoltBrand compact />
            <div style={{ width: 40 }} aria-hidden="true" />
          </header>

          <section style={{ marginTop: 'clamp(2.2rem, 8vh, 4.7rem)' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 8vw, 2.65rem)' }}>Welcome to BoltShare</h1>
            <p style={{ marginTop: '0.7rem', color: '#8f9398', fontSize: '0.9rem' }}>
              Enter your email to continue. No password required.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                void sendCode()
              }}
              style={{ marginTop: '2.1rem' }}
            >
              <label className="premium-label" htmlFor="boltshare-email">
                Email address
              </label>
              <div className="premium-field-wrap">
                <Mail className="premium-field-icon" size={17} />
                <input
                  id="boltshare-email"
                  className="premium-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={sending}
                  autoFocus
                />
              </div>

              <button type="submit" className="premium-primary-button" disabled={sending} style={{ marginTop: '0.85rem' }}>
                {sending ? (
                  <>
                    <RefreshCw size={17} style={{ animation: 'premium-spin 800ms linear infinite' }} />
                    Sending secure code…
                  </>
                ) : (
                  <>
                    Send secure code
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.38rem', alignItems: 'center', marginTop: '0.85rem', color: '#74797e', fontSize: '0.71rem' }}>
              <LockKeyhole size={12} color="var(--bs-gold)" />
              <span>No password required</span>
            </div>

            <div style={{ marginTop: '2.35rem' }}>
              <p className="premium-eyebrow" style={{ marginBottom: '0.75rem' }}>Built for your privacy</p>
              <div className="premium-security-list">
                <div className="premium-security-row">
                  <span className="premium-security-icon"><LockKeyhole size={15} /></span>
                  <div>
                    <div style={{ fontSize: '0.79rem', fontWeight: 660, color: '#f0f0ec' }}>Protected transfers</div>
                    <p style={{ marginTop: '0.16rem', color: '#777c81', fontSize: '0.69rem', lineHeight: 1.5 }}>Secure delivery controls protect each file you share.</p>
                  </div>
                </div>
                <div className="premium-security-row">
                  <span className="premium-security-icon"><EyeOff size={15} /></span>
                  <div>
                    <div style={{ fontSize: '0.79rem', fontWeight: 660, color: '#f0f0ec' }}>Private by default</div>
                    <p style={{ marginTop: '0.16rem', color: '#777c81', fontSize: '0.69rem', lineHeight: 1.5 }}>Your shared file contents are not used for ad targeting or sold.</p>
                  </div>
                </div>
                <div className="premium-security-row">
                  <span className="premium-security-icon"><DatabaseZap size={15} /></span>
                  <div>
                    <div style={{ fontSize: '0.79rem', fontWeight: 660, color: '#f0f0ec' }}>Automatic expiry</div>
                    <p style={{ marginTop: '0.16rem', color: '#777c81', fontSize: '0.69rem', lineHeight: 1.5 }}>Files and transfer records are permanently deleted 48 hours after upload.</p>
                  </div>
                </div>
              </div>
            </div>

            <p style={{ margin: '1.65rem auto 0', maxWidth: 310, color: '#5e6368', fontSize: '0.67rem', lineHeight: 1.55, textAlign: 'center' }}>
              By continuing, you agree to BoltShare&apos;s secure sign-in process and acknowledge our{' '}
              <Link href="/privacy" style={{ color: '#92969b', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="premium-page">
      <div className="premium-shell premium-enter">
        <header style={{ minHeight: 44 }}>
          <button type="button" className="premium-icon-button" onClick={() => { setScreen('email'); setOtp('') }} aria-label="Change email address">
            <ArrowLeft size={20} />
          </button>
        </header>

        <section style={{ marginTop: 'clamp(2.2rem, 8vh, 5.2rem)' }}>
          <BoltBrand />

          <div style={{ marginTop: '2.25rem' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 8vw, 2.6rem)' }}>Verify your email</h1>
            <p style={{ marginTop: '0.7rem', color: '#8f9398', fontSize: '0.9rem', lineHeight: 1.65 }}>
              We sent a six-digit code to<br />
              <strong style={{ color: '#f2f2ef', fontWeight: 650 }}>{maskEmail(email)}</strong>{' '}
              <CheckCircle2 size={14} color="var(--bs-success)" style={{ display: 'inline', verticalAlign: '-2px' }} />
            </p>
          </div>

          <div style={{ marginTop: '2.25rem' }}>
            <label className="premium-label" htmlFor="boltshare-otp">
              Enter six-digit code
            </label>

            <div className="premium-otp-wrap" onClick={() => otpInputRef.current?.focus()}>
              <input
                ref={otpInputRef}
                id="boltshare-otp"
                className="premium-otp-native"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Six-digit BoltShare sign-in code"
                value={otp}
                maxLength={OTP_LENGTH}
                onChange={(event) => handleOtpChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && otp.length === OTP_LENGTH) {
                    event.preventDefault()
                    void verifyCode()
                  }
                }}
                disabled={verifying}
              />

              {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                const character = otp[index] ?? ''
                const isActive = index === Math.min(otp.length, OTP_LENGTH - 1) && !verifying
                return (
                  <div
                    key={index}
                    className={`premium-otp-cell${character ? ' is-filled' : ''}${isActive ? ' is-active' : ''}`}
                    aria-hidden="true"
                  >
                    {character}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', marginTop: '1.05rem', color: '#74797e', fontSize: '0.71rem' }}>
              <ShieldCheck size={13} />
              <span>This code expires shortly</span>
            </div>
          </div>

          <button
            type="button"
            className="premium-primary-button"
            onClick={() => void verifyCode()}
            disabled={verifying || otp.length !== OTP_LENGTH}
            style={{ marginTop: '2.2rem' }}
          >
            {verifying ? (
              <>
                <RefreshCw size={17} style={{ animation: 'premium-spin 800ms linear infinite' }} />
                Verifying…
              </>
            ) : (
              <>
                Verify and continue
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <button
            type="button"
            className="premium-secondary-button"
            onClick={() => void sendCode()}
            disabled={sending || resendSeconds > 0}
            style={{ marginTop: '0.72rem' }}
          >
            <RefreshCw size={15} />
            {sending
              ? 'Sending…'
              : resendSeconds > 0
                ? `Resend code (${formatCountdown(resendSeconds)})`
                : 'Resend code'}
          </button>

          <button
            type="button"
            onClick={() => { setScreen('email'); setOtp('') }}
            style={{ display: 'block', margin: '1.2rem auto 0', border: 0, background: 'transparent', color: '#a7aaad', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', textUnderlineOffset: 4 }}
          >
            Change email
          </button>
        </section>
      </div>
    </main>
  )
}
