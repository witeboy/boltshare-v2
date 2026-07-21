import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How BoltShare collects, uses, protects, and deletes personal data.',
  alternates: { canonical: '/privacy' },
}

const sectionStyle = {
  background: '#171717',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '18px',
  padding: '1.25rem',
} as const

export default function PrivacyPolicyPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0D0D0D', color: '#fff', padding: '2rem 1rem 4rem' }}>
      <div style={{ width: '100%', maxWidth: '780px', margin: '0 auto' }}>
        <Link href="/" style={{ color: '#F5C518', textDecoration: 'none', fontWeight: 700 }}>
          BoltShare
        </Link>

        <header style={{ padding: '2.5rem 0 1.5rem' }}>
          <p style={{ color: '#F5C518', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Privacy &amp; data
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 7vw, 3.4rem)', lineHeight: 1.05, margin: '0.5rem 0 1rem' }}>Privacy Policy</h1>
          <p style={{ color: '#A3A3A3', lineHeight: 1.7, margin: 0 }}>Effective July 15, 2026 - Operated by RC Inc.</p>
        </header>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <section style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>What this policy covers</h2>
            <p style={{ color: '#B8B8B8', lineHeight: 1.75, margin: 0 }}>
              This policy applies to the BoltShare Android app and the BoltShare service at boltshare.rcinc.app. BoltShare lets you upload supported files, create private sharing links or transfer codes, and track downloads.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>Data we collect</h2>
            <ul style={{ color: '#B8B8B8', lineHeight: 1.75, margin: 0, paddingLeft: '1.25rem' }}>
              <li><strong style={{ color: '#fff' }}>Account data:</strong> your email address and authentication records.</li>
              <li><strong style={{ color: '#fff' }}>Files and transfer data:</strong> uploaded file content, file name, type, size, share settings, transfer code, expiry, download limit, and optional recipient email.</li>
              <li><strong style={{ color: '#fff' }}>Team data:</strong> organization name, membership, role, and invited member email addresses.</li>
              <li><strong style={{ color: '#fff' }}>Download and security data:</strong> download time, IP address, user-agent information, and download count.</li>
              <li><strong style={{ color: '#fff' }}>Support data:</strong> information you include when you contact support.</li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>How we use data</h2>
            <p style={{ color: '#B8B8B8', lineHeight: 1.75, margin: 0 }}>
              We use this data to authenticate users; upload, store, deliver, and delete files; enforce passwords, expiry dates, and download limits; show transfer history and download analytics; operate team features; send requested transfer emails; prevent abuse; troubleshoot problems; and respond to support requests. We do not sell personal data.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>Service providers</h2>
            <p style={{ color: '#B8B8B8', lineHeight: 1.75, margin: 0 }}>
              BoltShare uses service providers to operate the product, including Supabase for authentication and database services, Bunny.net for file storage and delivery, Vercel for application hosting, and Mailjet for requested email delivery. These providers process data only as needed to provide their services and under their own privacy and security terms.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>Retention and deletion</h2>
            <p style={{ color: '#B8B8B8', lineHeight: 1.75, margin: '0 0 0.75rem' }}>
              Shared files, transfer records, and associated download logs are automatically deleted 48 hours after upload. You can delete an active transfer sooner from your account.
            </p>
            <p style={{ color: '#B8B8B8', lineHeight: 1.75, margin: 0 }}>
              You can permanently delete your account in BoltShare Settings. Successful deletion removes your authentication account, files you own, their active share links, related download logs, and your team memberships. Infrastructure logs or backups may remain temporarily where required for security, legal compliance, or a service provider&apos;s normal backup cycle. See the{' '}
              <Link href="/account-deletion" style={{ color: '#F5C518' }}>Account Deletion page</Link> for instructions.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>Security and your choices</h2>
            <p style={{ color: '#B8B8B8', lineHeight: 1.75, margin: 0 }}>
              We use access controls and encrypted HTTPS connections to protect data in transit. No internet service can guarantee absolute security. You control each share&apos;s password, expiry, and download limit and can delete active transfers from your account.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>Children and changes</h2>
            <p style={{ color: '#B8B8B8', lineHeight: 1.75, margin: 0 }}>
              BoltShare is not directed to children under 13. We may update this policy as the service changes. The effective date above identifies the latest version.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>Contact</h2>
            <p style={{ color: '#B8B8B8', lineHeight: 1.75, margin: 0 }}>
              Questions or privacy requests can be sent to{' '}
              <a href="mailto:support@rcinc.app" style={{ color: '#F5C518' }}>support@rcinc.app</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
