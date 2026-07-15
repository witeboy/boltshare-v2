import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Delete Your Account',
  description: 'How to request permanent deletion of a BoltShare account and associated data.',
  alternates: { canonical: '/account-deletion' },
}

export default function AccountDeletionPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0D0D0D', color: '#fff', padding: '2rem 1rem 4rem' }}>
      <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/" style={{ color: '#F5C518', textDecoration: 'none', fontWeight: 700 }}>
          BoltShare
        </Link>

        <header style={{ padding: '2.5rem 0 1.5rem' }}>
          <p style={{ color: '#E24B4A', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Account deletion
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 7vw, 3.4rem)', lineHeight: 1.05, margin: '0.5rem 0 1rem' }}>Delete your BoltShare account</h1>
          <p style={{ color: '#A3A3A3', lineHeight: 1.7, margin: 0 }}>
            This page explains how any BoltShare user can permanently delete their account and associated data.
          </p>
        </header>

        <section style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '1.25rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem' }}>Delete inside the app</h2>
          <ol style={{ color: '#C3C3C3', lineHeight: 1.8, margin: 0, paddingLeft: '1.25rem' }}>
            <li>Open BoltShare and sign in with the email address for the account.</li>
            <li>Open <strong style={{ color: '#fff' }}>Settings</strong>.</li>
            <li>Scroll to <strong style={{ color: '#fff' }}>Danger Zone</strong> and choose <strong style={{ color: '#fff' }}>Delete Account</strong>.</li>
            <li>Type <strong style={{ color: '#fff' }}>DELETE</strong> and confirm.</li>
          </ol>
          <Link href="/settings" style={{ display: 'inline-block', marginTop: '1rem', background: '#F5C518', color: '#0D0D0D', borderRadius: '10px', padding: '0.75rem 1rem', fontWeight: 800, textDecoration: 'none' }}>
            Open BoltShare Settings
          </Link>
        </section>

        <section style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '1.25rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>What is deleted</h2>
          <ul style={{ color: '#C3C3C3', lineHeight: 1.8, margin: 0, paddingLeft: '1.25rem' }}>
            <li>Your BoltShare authentication account and email address</li>
            <li>Files you uploaded and the active links or codes for those files</li>
            <li>Transfer history and download logs linked to your files</li>
            <li>Your team memberships</li>
          </ul>
          <p style={{ color: '#E7B9B8', lineHeight: 1.7, margin: '1rem 0 0' }}>
            Deletion is permanent. Recipients immediately lose access to your active shares.
          </p>
        </section>

        <section style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '1.25rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>If you cannot sign in</h2>
          <p style={{ color: '#C3C3C3', lineHeight: 1.75, margin: 0 }}>
            Email{' '}
            <a href="mailto:support@rcinc.app?subject=Delete%20my%20BoltShare%20account" style={{ color: '#F5C518' }}>support@rcinc.app</a>{' '}
            from the address registered to your account with the subject &quot;Delete my BoltShare account.&quot; We may ask you to verify ownership before processing the request.
          </p>
        </section>

        <section style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>Retention</h2>
          <p style={{ color: '#C3C3C3', lineHeight: 1.75, margin: 0 }}>
            The in-app deletion process removes the account data listed above after successful confirmation. We do not intentionally keep that account data afterward. Limited infrastructure logs or backups may persist temporarily where required for security, legal compliance, or a service provider&apos;s normal backup cycle. For more information, read the{' '}
            <Link href="/privacy" style={{ color: '#F5C518' }}>Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </main>
  )
}
