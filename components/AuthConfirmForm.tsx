'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, ShieldCheck, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AuthConfirmFormProps {
  tokenHash: string | null
  code: string | null
  nextPath: string
  initialError: string | null
}

export function AuthConfirmForm({
  tokenHash,
  code,
  nextPath,
  initialError,
}: AuthConfirmFormProps) {
  const [confirming, setConfirming] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialError)

  const handleConfirm = async () => {
    if (confirming || (!tokenHash && !code)) return

    setConfirming(true)
    setErrorMessage(null)

    try {
      const supabase = createClient()
      const { error } = tokenHash
        ? await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email',
          })
        : await supabase.auth.exchangeCodeForSession(code as string)

      if (error) {
        setErrorMessage(
          'This sign-in request is invalid or expired. Return to BoltShare and request a new email.',
        )
        return
      }

      window.location.replace(nextPath)
    } catch (error) {
      console.error('Unable to confirm BoltShare sign-in:', error)
      setErrorMessage(
        'BoltShare could not complete sign-in. Return to the app and request a new email.',
      )
    } finally {
      setConfirming(false)
    }
  }

  const canConfirm = Boolean(tokenHash || code) && !errorMessage

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0D0D0D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#1A1A1A',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: '22px',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: '#F5C518',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 0 32px rgba(245,197,24,0.3)',
          }}
        >
          {canConfirm ? (
            <ShieldCheck size={32} color="#000" />
          ) : (
            <Zap size={32} color="#000" fill="#000" />
          )}
        </div>

        <h1
          style={{
            color: '#fff',
            fontSize: '1.45rem',
            fontWeight: 700,
            marginBottom: '0.65rem',
          }}
        >
          {canConfirm ? 'Confirm your BoltShare sign-in' : 'Sign-in link unavailable'}
        </h1>

        <p
          style={{
            color: errorMessage ? '#E88987' : '#8A8A8A',
            fontSize: '0.9rem',
            lineHeight: 1.65,
            marginBottom: '1.5rem',
          }}
        >
          {errorMessage ??
            'Tap the button below to finish signing in. This extra step prevents email scanners from using your one-time link before you do.'}
        </p>

        {canConfirm ? (
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={confirming}
            style={{
              width: '100%',
              background: confirming ? '#B8960F' : '#F5C518',
              color: '#000',
              border: 'none',
              borderRadius: '11px',
              padding: '0.95rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: confirming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {confirming ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Signing in...
              </>
            ) : (
              <>
                Confirm and Sign In
                <ArrowRight size={18} />
              </>
            )}
          </button>
        ) : (
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              background: '#F5C518',
              color: '#000',
              borderRadius: '11px',
              padding: '0.95rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            Return to BoltShare
          </Link>
        )}
      </section>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )
}
