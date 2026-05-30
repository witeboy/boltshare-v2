import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'BoltShare — Secure File Sharing',
  description: 'Send and receive files securely with BoltShare.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0D0D0D] text-white antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#1A1A1A',
                color: '#fff',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '13px',
              },
              success: {
                iconTheme: { primary: '#F5C518', secondary: '#000' },
              },
              error: {
                iconTheme: { primary: '#E24B4A', secondary: '#fff' },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}