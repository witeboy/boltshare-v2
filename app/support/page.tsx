import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Contact BoltShare support, report a problem, or request help with a file transfer.',
  alternates: { canonical: '/support' },
}

const cardStyle = {
  background: 'var(--bs-surface)',
  border: '1px solid var(--bs-border)',
  borderRadius: '18px',
  padding: '1.25rem',
} as const

export default function SupportPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1rem 4rem' }}>
      <div style={{ width: '100%', maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--bs-gold)', textDecoration: 'none', fontWeight: 760 }}>
          BoltShare
        </Link>

        <header style={{ padding: '2.5rem 0 1.5rem' }}>
          <p style={{ color: 'var(--bs-gold)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Help center
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 7vw, 3.4rem)', margin: '0.5rem 0 1rem' }}>BoltShare Support</h1>
          <p style={{ maxWidth: 600, margin: 0 }}>
            Get help with uploads, downloads, transfer codes, privacy, or your BoltShare account.
          </p>
        </header>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <section style={cardStyle}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.65rem' }}>Contact support</h2>
            <p style={{ marginBottom: '1rem' }}>
              Email our support team at{' '}
              <a href="mailto:support@rcinc.app" style={{ color: 'var(--bs-gold)' }}>support@rcinc.app</a>.
              Include your device model, operating-system version, and a short description of what happened. Do not email passwords or private file links.
            </p>
            <a
              href="mailto:support@rcinc.app?subject=BoltShare%20support%20request"
              className="premium-primary-button"
              style={{ maxWidth: 320, textDecoration: 'none' }}
            >
              Email BoltShare Support
            </a>
          </section>

          <section style={cardStyle}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.65rem' }}>Common questions</h2>
            <ul style={{ color: 'var(--bs-text-2)', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Guest transfers do not require registration or an email address.</li>
              <li>Files and their transfer records expire automatically 48 hours after upload.</li>
              <li>A password-protected transfer needs the password chosen by its sender; support cannot recover it.</li>
              <li>If a download limit has been reached, ask the sender to create a new transfer.</li>
            </ul>
          </section>

          <section style={cardStyle}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.65rem' }}>Privacy and accounts</h2>
            <p style={{ margin: 0 }}>
              Read the <Link href="/privacy" style={{ color: 'var(--bs-gold)' }}>Privacy Policy</Link> or visit the{' '}
              <Link href="/account-deletion" style={{ color: 'var(--bs-gold)' }}>Account Deletion page</Link>.
              Privacy and deletion requests may also be sent to the support email above.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}

