'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight,
  Zap,
  Shield,
  Clock,
  Upload,
  BarChart2,
  Lock,
  Mail,
  Loader2,
  KeyRound,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STEPS = [
  {
    icon: '⚡',
    title: 'Share Files Instantly',
    subtitle: 'Secure, blazing-fast file sharing powered by Bunny CDN.',
    illustration: (
      <div style={{ position: 'relative', width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'absolute', width: '200px', height: '200px', background: 'rgba(245,197,24,0.08)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <div style={{ position: 'relative', width: '100px', height: '100px', background: '#F5C518', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 48px rgba(245,197,24,0.4)' }}>
          <Zap size={52} color="#000" fill="#000" />
        </div>
        {[
          { icon: <Shield size={18} color="#F5C518" />, top: '10px', right: '60px' },
          { icon: <Upload size={18} color="#60A5FA" />, bottom: '20px', left: '50px' },
          { icon: <Clock size={18} color="#1D9E75" />, top: '30px', left: '40px' },
        ].map((item, index) => (
          <div key={index} style={{ position: 'absolute', top: item.top, bottom: item.bottom, left: item.left, right: item.right, width: '40px', height: '40px', background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.icon}
          </div>
        ))}
      </div>
    ),
    features: null,
  },
  {
    icon: '📤',
    title: 'How It Works',
    subtitle: 'Three simple steps to share any file securely.',
    illustration: null,
    features: [
      { num: '1', icon: <Upload size={18} color="#F5C518" />, title: 'Upload', desc: 'Drag & drop or select files up to 4 MB each' },
      { num: '2', icon: <Zap size={18} color="#60A5FA" />, title: 'Share', desc: 'Get a link, QR code, or send via email' },
      { num: '3', icon: <Clock size={18} color="#1D9E75" />, title: 'Expire', desc: 'Files auto-delete in 1h, 6h, 24h, or 7 days' },
    ],
  },
  {
    icon: '🛡',
    title: 'Enterprise Security',
    subtitle: 'Everything you need to share files safely.',
    illustration: null,
    features: null,
    benefits: [
      { icon: <Lock size={16} color="#F5C518" />, title: 'Password Protected', desc: 'Optional secure access' },
      { icon: <Clock size={16} color="#60A5FA" />, title: 'Auto-Delete', desc: 'Time-based expiry' },
      { icon: <BarChart2 size={16} color="#1D9E75" />, title: 'Analytics', desc: 'Track every download' },
      { icon: <Shield size={16} color="#8B5CF6" />, title: 'Private Links', desc: 'Optional password protection' },
    ],
  },
]

export default function OnboardingPage() {
  const { isAuthenticated, isLoadingAuth } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isLoadingAuth, router])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const seen = localStorage.getItem('bs_onboarded')
    if (seen && !isLoadingAuth && !isAuthenticated) {
      queueMicrotask(() => setShowLogin(true))
    }

  }, [isLoadingAuth, isAuthenticated])

  const goNext = () => {
    if (step < STEPS.length - 1) {
      setStep((currentStep) => currentStep + 1)
      return
    }

    localStorage.setItem('bs_onboarded', '1')
    setShowLogin(true)
  }

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Please enter a valid email')
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
      setSent(true)
      localStorage.setItem('bs_onboarded', '1')
    } catch (error) {
      console.error('Unable to send BoltShare sign-in email:', error)
      toast.error('Sign-in is temporarily unavailable. Please try again shortly.')
    } finally {
      setSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    const token = otp.replace(/\D/g, '')

    if (token.length !== 6) {
      toast.error('Enter the six-digit code from your email')
      return
    }

    if (verifying) return

    setVerifying(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })

      if (error) {
        toast.error('That code is invalid or expired. Request a new email and try again.')
        return
      }

      toast.success('Signed in successfully')
      router.replace('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('Unable to verify BoltShare email code:', error)
      toast.error('The code could not be verified. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  if (isLoadingAuth) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #F5C518', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (showLogin) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 0 32px rgba(245,197,24,0.35)' }}>
              <Zap size={32} color="#000" fill="#000" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>BoltShare</h1>
            <p style={{ color: '#8A8A8A', marginTop: '6px', fontSize: '0.875rem' }}>Secure file sharing, blazing fast</p>
          </div>

          <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.75rem' }}>
            {!sent ? (
              <>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>Sign in to BoltShare</h2>
                <p style={{ color: '#8A8A8A', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  Enter your email. We&apos;ll send a six-digit sign-in code.
                </p>

                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <Mail size={16} color="#8A8A8A" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="your@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void handleLogin()
                      }
                    }}
                    disabled={sending}
                    style={{ width: '100%', background: '#242424', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '10px', color: '#fff', padding: '0.85rem 1rem 0.85rem 2.75rem', fontSize: '0.95rem', outline: 'none', opacity: sending ? 0.7 : 1 }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleLogin()}
                  disabled={sending}
                  style={{ width: '100%', background: sending ? '#B8960F' : '#F5C518', color: '#000', border: 'none', borderRadius: '10px', padding: '0.9rem', fontWeight: 700, fontSize: '0.95rem', cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {sending ? (
                    <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
                  ) : (
                    <>Send Sign-In Code <ArrowRight size={18} /></>
                  )}
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '0.25rem 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(29,158,117,0.15)', border: '0.5px solid rgba(29,158,117,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Mail size={24} color="#1D9E75" />
                </div>
                <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '8px' }}>Check your email</h3>
                <p style={{ color: '#8A8A8A', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  Enter the six-digit code sent to <strong style={{ color: '#fff' }}>{email}</strong>.
                </p>

                <div style={{ position: 'relative', marginTop: '1.25rem' }}>
                  <KeyRound size={17} color="#8A8A8A" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label="Six-digit sign-in code"
                    placeholder="123456"
                    value={otp}
                    maxLength={6}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void handleVerifyOtp()
                      }
                    }}
                    disabled={verifying}
                    style={{ width: '100%', background: '#242424', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '10px', color: '#fff', padding: '0.85rem 1rem 0.85rem 2.75rem', fontSize: '1.1rem', letterSpacing: '0.3em', textAlign: 'center', outline: 'none' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleVerifyOtp()}
                  disabled={verifying || otp.length !== 6}
                  style={{ width: '100%', marginTop: '0.75rem', background: verifying || otp.length !== 6 ? '#4A4121' : '#F5C518', color: '#000', border: 'none', borderRadius: '10px', padding: '0.9rem', fontWeight: 700, fontSize: '0.95rem', cursor: verifying || otp.length !== 6 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {verifying ? (
                    <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</>
                  ) : (
                    <>Verify Code <ArrowRight size={18} /></>
                  )}
                </button>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => void handleLogin()} disabled={sending} style={{ background: 'transparent', border: 'none', color: '#F5C518', fontSize: '0.8rem', cursor: sending ? 'not-allowed' : 'pointer', textDecoration: 'underline' }}>
                    Resend code
                  </button>
                  <button type="button" onClick={() => { setSent(false); setOtp('') }} style={{ background: 'transparent', border: 'none', color: '#8A8A8A', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    Change email
                  </button>
                </div>
              </div>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button type="button" onClick={() => { setShowLogin(false); setSent(false); setOtp('') }} style={{ background: 'none', border: 'none', color: '#555', fontSize: '0.8rem', cursor: 'pointer' }}>
              ← Back to intro
            </button>
          </p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const current = STEPS[step]

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '400px', height: '400px', background: 'rgba(245,197,24,0.04)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: 0, right: 0, width: '400px', height: '400px', background: 'rgba(245,197,24,0.03)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        <div key={step} style={{ animation: 'fadeSlide 0.3s ease' }}>
          {current.illustration}
          {!current.illustration && (
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{current.icon}</div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '10px' }}>
              {current.title}
            </h1>
            <p style={{ color: '#8A8A8A', fontSize: '0.95rem', lineHeight: 1.6 }}>{current.subtitle}</p>
          </div>

          {current.features && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
              {current.features.map((feature, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', background: '#242424', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {feature.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{feature.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>{feature.desc}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(245,197,24,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#F5C518', flexShrink: 0 }}>
                    {feature.num}
                  </div>
                </div>
              ))}
            </div>
          )}

          {current.benefits && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem' }}>
              {current.benefits.map((benefit, index) => (
                <div key={index} style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ width: '36px', height: '36px', background: '#242424', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    {benefit.icon}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>{benefit.title}</div>
                  <div style={{ fontSize: '0.72rem', color: '#8A8A8A' }}>{benefit.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {STEPS.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to onboarding step ${index + 1}`}
                onClick={() => setStep(index)}
                style={{ height: '8px', width: index === step ? '24px' : '8px', borderRadius: '4px', background: index === step ? '#F5C518' : '#333', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {step < STEPS.length - 1 ? (
              <>
                <button type="button" onClick={() => setShowLogin(true)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '0.8rem', cursor: 'pointer', padding: '8px' }}>
                  Sign In
                </button>
                <button type="button" onClick={goNext} style={{ background: '#F5C518', color: '#000', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Next <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <button type="button" onClick={goNext} style={{ background: '#F5C518', color: '#000', border: 'none', borderRadius: '12px', padding: '12px 28px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Get Started <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>

        {step === 0 && (
          <p style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button type="button" onClick={() => setShowLogin(true)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '0.75rem', cursor: 'pointer' }}>
              Already have an account? Sign in
            </button>
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  )
}
