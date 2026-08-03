import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'
import { Toaster } from 'react-hot-toast'
import { APP_URL } from '@/lib/config'
import { PreferencesProvider } from '@/lib/PreferencesContext'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: 'BoltShare — Fast, Private File Transfer',
    template: '%s | BoltShare',
  },

  description:
    'Send files through private, expiring links with optional password protection and download limits.',

  alternates: {
    canonical: '/',
  },

  applicationName: 'BoltShare',

  keywords: [
    'file transfer',
    'secure file sharing',
    'expiring file links',
    'private file sharing',
  ],

  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'BoltShare',
    title: 'BoltShare — Fast, Private File Transfer',
    description:
      'Send files through private, expiring links with optional password protection.',
  },

  twitter: {
    card: 'summary',
    title: 'BoltShare — Fast, Private File Transfer',
    description:
      'Send files through private, expiring links with optional password protection.',
  },

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="antialiased">
        <PreferencesProvider>
          <AuthProvider>
            {children}

          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'var(--bs-surface-2)',
                color: 'var(--bs-text)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '13px',
              },

              success: {
                iconTheme: {
                  primary: '#F5C518',
                  secondary: '#000',
                },
              },

              error: {
                iconTheme: {
                  primary: '#E24B4A',
                  secondary: '#fff',
                },
              },
            }}
          />
          </AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  )
}
