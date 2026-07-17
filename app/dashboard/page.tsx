'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Archive,
  ArrowLeftRight,
  Bell,
  FileText,
  Film,
  Home,
  Image as ImageIcon,
  Link2,
  Menu,
  Send,
  Settings,
  Upload,
  Users,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { createClient } from '@/lib/supabase/client'

interface SharedFile {
  id: string
  file_name: string
  file_type: string
  file_size: number | null
  share_method: string
  status: string
  expires_at: string
  download_count: number | null
  created_at: string
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 MB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function timeAgo(dateString: string) {
  const difference = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(difference / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`

  return `${Math.floor(hours / 24)}d`
}

function isFileActive(file: SharedFile) {
  return file.status === 'active' && new Date(file.expires_at).getTime() > Date.now()
}

function FileTypeIcon({ type }: { type: string }) {
  if (type?.includes('image')) return <ImageIcon size={18} color="#ffc916" />
  if (type?.includes('video')) return <Film size={18} color="#9d84ff" />
  if (type?.includes('pdf')) return <FileText size={18} color="#ff6868" />
  if (type?.includes('zip') || type?.includes('archive')) return <Archive size={18} color="#ffb638" />
  return <FileText size={18} color="#75a7ff" />
}

function LoadingScreen() {
  return (
    <div className="premium-page" style={{ display: 'grid', placeItems: 'center' }}>
      <div className="premium-spinner" aria-label="Loading dashboard" />
    </div>
  )
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [files, setFiles] = useState<SharedFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, isLoadingAuth, router])

  useEffect(() => {
    if (!user?.email) return

    let cancelled = false

    async function loadDashboard() {
      setLoading(true)

      const { data, error } = await supabase
        .from('shared_files')
        .select('id,file_name,file_type,file_size,share_method,status,expires_at,download_count,created_at')
        .eq('sender_email', user!.email)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!cancelled) {
        if (error) {
          console.error('Unable to load BoltShare dashboard:', error)
          setFiles([])
        } else {
          setFiles((data ?? []) as SharedFile[])
        }
        setLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [supabase, user])

  if (isLoadingAuth || !isAuthenticated) {
    return <LoadingScreen />
  }

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there'

  const activeFiles = files.filter(isFileActive)
  const totalDownloads = files.reduce((total, file) => total + (file.download_count ?? 0), 0)
  const totalBytes = files.reduce((total, file) => total + (file.file_size ?? 0), 0)
  const activeBytes = activeFiles.reduce((total, file) => total + (file.file_size ?? 0), 0)
  const activeFootprintPercent = totalBytes > 0 ? Math.max(4, Math.min(100, (activeBytes / totalBytes) * 100)) : 0
  const recentFiles = files.slice(0, 4)

  const quickActions = [
    { label: 'New transfer', href: '/upload', icon: Send },
    { label: 'My links', href: '/history', icon: Link2 },
    { label: 'Team', href: '/team', icon: Users },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: Home, active: true },
    { label: 'Transfers', href: '/history', icon: ArrowLeftRight, active: false },
    { label: 'Team', href: '/team', icon: Users, active: false },
    { label: 'Settings', href: '/settings', icon: Settings, active: false },
  ]

  return (
    <main className="premium-page">
      <div className="premium-dashboard-shell premium-enter">
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#f4f4f0', fontSize: '0.98rem', fontWeight: 720 }}>
              <Zap size={18} color="var(--bs-gold)" fill="var(--bs-gold)" />
              Bolt<span style={{ color: 'var(--bs-gold)', marginLeft: '-0.42rem' }}>Share</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
            <Link href="/history" className="premium-icon-button" aria-label="Open recent transfers">
              <Bell size={19} />
            </Link>
            <Link href="/settings" className="premium-icon-button" aria-label="Open menu and settings">
              <Menu size={20} />
            </Link>
          </div>
        </header>

        <section style={{ marginTop: '1.1rem' }}>
          <p style={{ color: '#ecece8', fontSize: '0.98rem', fontWeight: 680 }}>
            Good morning, {firstName} <span aria-hidden="true">👋</span>
          </p>

          <Link href="/upload" style={{ display: 'block', marginTop: '0.9rem', color: 'inherit', textDecoration: 'none' }}>
            <div className="premium-upload-panel">
              <div style={{ display: 'grid', width: 42, height: 42, placeItems: 'center', borderRadius: '50%', background: 'rgba(255,201,22,0.12)', color: 'var(--bs-gold)', boxShadow: '0 0 28px rgba(255,201,22,0.1)' }}>
                <Upload size={21} />
              </div>
              <h2 style={{ marginTop: '0.65rem', fontSize: '0.94rem', letterSpacing: '-0.015em' }}>Upload or drop your files</h2>
              <p style={{ marginTop: '0.18rem', color: '#74797e', fontSize: '0.68rem' }}>Secure, private and automatically expiring</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.72rem', borderRadius: 8, background: 'var(--bs-gold)', padding: '0.48rem 0.78rem', color: '#0b0b08', fontSize: '0.72rem', fontWeight: 750 }}>
                Upload files
                <Upload size={13} />
              </span>
            </div>
          </Link>
        </section>

        <section style={{ marginTop: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <h2 style={{ fontSize: '0.82rem', letterSpacing: '-0.01em' }}>Quick actions</h2>
          </div>

          <div className="premium-quick-grid">
            {quickActions.map(({ label, href, icon: Icon }) => (
              <Link key={label} href={href} className="premium-quick-action">
                <Icon size={18} color="#d9d9d5" />
                <span style={{ overflow: 'hidden', width: '100%', textAlign: 'center', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginTop: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.58rem' }}>
            <h2 style={{ fontSize: '0.82rem', letterSpacing: '-0.01em' }}>Recent transfers</h2>
            <Link href="/history" style={{ color: '#8d9297', fontSize: '0.68rem', textDecoration: 'none' }}>See all</Link>
          </div>

          <div className="premium-dashboard-card" style={{ overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '1.6rem', color: '#686d72', fontSize: '0.78rem', textAlign: 'center' }}>Loading transfers…</div>
            ) : recentFiles.length === 0 ? (
              <div style={{ padding: '1.75rem 1rem', textAlign: 'center' }}>
                <Upload size={25} color="#555b62" style={{ margin: '0 auto' }} />
                <p style={{ marginTop: '0.45rem', color: '#6f747a', fontSize: '0.76rem' }}>Your first secure transfer will appear here.</p>
              </div>
            ) : (
              recentFiles.map((file) => {
                const active = isFileActive(file)
                return (
                  <Link key={file.id} href={`/file-analytics/${file.id}`} className="premium-file-row">
                    <span className="premium-file-icon">
                      <FileTypeIcon type={file.file_type} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', overflow: 'hidden', color: '#eeeeea', fontSize: '0.77rem', fontWeight: 620, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.file_name}
                      </span>
                      <span style={{ display: 'block', marginTop: '0.18rem', color: '#686d72', fontSize: '0.64rem' }}>
                        {formatBytes(file.file_size ?? 0)} · {file.download_count ?? 0} downloads · {timeAgo(file.created_at)}
                      </span>
                    </span>
                    <span style={{ color: active ? 'var(--bs-success)' : '#70757a', fontSize: '0.64rem', fontWeight: 640 }}>
                      {active ? 'Active' : 'Expired'}
                    </span>
                  </Link>
                )
              })
            )}
          </div>
        </section>

        <section style={{ marginTop: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.58rem' }}>
            <h2 style={{ fontSize: '0.82rem', letterSpacing: '-0.01em' }}>Transfer overview</h2>
            <span style={{ color: '#696e73', fontSize: '0.65rem' }}>Current account</span>
          </div>

          <div className="premium-dashboard-card premium-stat-grid">
            <div className="premium-stat-cell">
              <div className="premium-stat-value">{files.length}</div>
              <div className="premium-stat-caption">Transfers</div>
            </div>
            <div className="premium-stat-cell">
              <div className="premium-stat-value">{totalDownloads}</div>
              <div className="premium-stat-caption">Downloads</div>
            </div>
            <div className="premium-stat-cell">
              <div className="premium-stat-value">{formatBytes(totalBytes)}</div>
              <div className="premium-stat-caption">Transferred</div>
            </div>
          </div>
        </section>

        <section className="premium-dashboard-card" style={{ marginTop: '0.75rem', padding: '0.82rem 0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.62rem' }}>
            <span style={{ color: '#e3e3df', fontSize: '0.72rem', fontWeight: 640 }}>Active transfer footprint</span>
            <span style={{ color: '#74797e', fontSize: '0.64rem' }}>{formatBytes(activeBytes)} active · {formatBytes(totalBytes)} total</span>
          </div>
          <div className="premium-progress-track">
            <div className="premium-progress-value" style={{ width: `${activeFootprintPercent}%` }} />
          </div>
        </section>
      </div>

      <nav className="premium-bottom-nav" aria-label="Primary navigation">
        <div className="premium-bottom-nav-inner">
          {navItems.map(({ label, href, icon: Icon, active }) => (
            <Link key={label} href={href} className={`premium-nav-link${active ? ' is-active' : ''}`}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  )
}
