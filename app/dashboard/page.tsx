'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, ChevronRight, Download, Eye, Plus, Send, Settings, Upload } from 'lucide-react'
import AppBottomNav from '@/components/boltshare/AppBottomNav'
import FileTypeIcon from '@/components/boltshare/FileTypeIcon'
import StatCard from '@/components/boltshare/StatCard'
import { useAuth } from '@/lib/AuthContext'
import { getReceivedTransfers, type ReceivedTransfer } from '@/lib/received-history'
import { createClient } from '@/lib/supabase/client'

interface SharedFile {
  id: string
  file_name: string
  file_type: string
  file_size: number | null
  status: string
  expires_at: string
  download_count: number | null
  max_downloads: number | null
  created_at: string
}

type ActivityItem = {
  kind: 'sent' | 'received'
  id: string
  name: string
  type: string
  size: number
  date: string
  href: string
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 MB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function timeAgo(dateString: string, currentTime: number) {
  const difference = Math.max(0, currentTime - new Date(dateString).getTime())
  const minutes = Math.floor(difference / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function isFileActive(file: SharedFile, currentTime: number) {
  return file.status === 'active' && new Date(file.expires_at).getTime() > currentTime
}

function LoadingScreen() {
  return (
    <div className="bolt-page bolt-loading-screen">
      <div className="premium-spinner" aria-label="Loading dashboard" />
    </div>
  )
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [files, setFiles] = useState<SharedFile[]>([])
  const [receivedFiles, setReceivedFiles] = useState<ReceivedTransfer[]>(getReceivedTransfers)
  const [loading, setLoading] = useState(true)
  const [systemHealthy, setSystemHealthy] = useState<boolean | null>(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) router.replace('/')
  }, [isAuthenticated, isLoadingAuth, router])

  useEffect(() => {
    const refresh = () => setReceivedFiles(getReceivedTransfers())
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function checkHealth() {
      try {
        const response = await fetch('/api/health', { cache: 'no-store', signal: controller.signal })
        const payload = (await response.json()) as { status?: string }
        setSystemHealthy(response.ok && payload.status === 'healthy')
      } catch {
        if (!controller.signal.aborted) setSystemHealthy(false)
      }
    }
    void checkHealth()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!user?.email) return
    let cancelled = false
    async function loadDashboard() {
      setLoading(true)
      const { data, error } = await supabase
        .from('shared_files')
        .select('id,file_name,file_type,file_size,status,expires_at,download_count,max_downloads,created_at')
        .eq('sender_email', user!.email)
        .order('created_at', { ascending: false })
        .limit(100)

      if (cancelled) return
      if (error) {
        console.error('Unable to load BoltShare dashboard:', error)
        setFiles([])
      } else {
        setFiles((data ?? []) as SharedFile[])
      }
      setLoading(false)
    }
    void loadDashboard()
    return () => { cancelled = true }
  }, [supabase, user])

  if (isLoadingAuth || !isAuthenticated) return <LoadingScreen />

  const rawFirstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)
  const totalDownloads = files.reduce((total, file) => total + (file.download_count ?? 0), 0)
  const alertCount = files.filter(file => {
    const expiresSoon = isFileActive(file, currentTime) && new Date(file.expires_at).getTime() - currentTime <= 6 * 60 * 60 * 1000
    const limitReached = Boolean(file.max_downloads && (file.download_count ?? 0) >= file.max_downloads)
    return expiresSoon || limitReached
  }).length

  const sentActivity: ActivityItem[] = files.map(file => ({
    kind: 'sent', id: file.id, name: file.file_name, type: file.file_type, size: file.file_size ?? 0,
    date: file.created_at, href: `/file-analytics/${file.id}`,
  }))
  const receivedActivity: ActivityItem[] = receivedFiles.map(file => ({
    kind: 'received', id: file.id, name: file.fileName, type: file.fileType, size: file.fileSize,
    date: file.downloadedAt, href: `/receive/${encodeURIComponent(file.token)}`,
  }))
  const recentActivity = [...sentActivity, ...receivedActivity]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 2)
  const systemStatusLabel = systemHealthy === null
    ? 'Checking system status'
    : systemHealthy
      ? 'All systems active'
      : 'Service status unavailable'

  return (
    <main className="bolt-dashboard-page">
      <div className="bolt-dashboard-shell premium-enter">
        <header className="bolt-dashboard-header">
          <span aria-hidden="true" />
          <span className="bolt-dashboard-brand">BoltShare</span>
          <Link href="/settings" className="bolt-dashboard-settings" aria-label="Open settings">
            <Settings aria-hidden="true" />
          </Link>
        </header>

        <section className="bolt-dashboard-hero" aria-labelledby="dashboard-welcome">
          <div>
            <p className="bolt-welcome-kicker">Welcome,</p>
            <h1 id="dashboard-welcome" className="bolt-welcome-name">{firstName}</h1>
            <div className={`bolt-system-status${systemHealthy === null ? ' is-checking' : systemHealthy ? '' : ' is-degraded'}`}>
              <span aria-hidden="true" />
              {systemStatusLabel}
            </div>
          </div>

          <div className="bolt-hero-actions">
            <Link href="/upload" className="bolt-action-button bolt-action-button-dark">
              <Plus aria-hidden="true" /> Send
            </Link>
            <Link href="/receive-code" className="bolt-action-button bolt-action-button-gold">
              <Download aria-hidden="true" /> Receive
            </Link>
          </div>
        </section>

        <section className="bolt-stat-grid" aria-label="Transfer statistics">
          <StatCard icon={Send} value={files.length} label="Sent" />
          <StatCard icon={Download} value={receivedFiles.length} label="Received" />
          <StatCard icon={Eye} value={totalDownloads} label="Downloads" />
          <StatCard icon={Bell} value={alertCount} label="Alerts" />
        </section>

        <Link href="/upload" className="bolt-send-panel" aria-label="Send a file">
          <span className="bolt-send-panel-icon"><Upload aria-hidden="true" /></span>
          <h2>Send a File</h2>
          <p>Drag &amp; drop or tap to upload</p>
          <span>Large files • Encrypted • Private</span>
        </Link>

        <section className="bolt-recent-section" aria-labelledby="recent-activity-heading">
          <div className="bolt-section-heading">
            <h2 id="recent-activity-heading">Recent Activity</h2>
            <Link href="/history">View all</Link>
          </div>
          <div className="bolt-activity-list">
            {loading ? (
              <div className="bolt-activity-empty">Loading activity…</div>
            ) : recentActivity.length === 0 ? (
              <div className="bolt-activity-empty">Your sent and received files will appear here.</div>
            ) : recentActivity.map(item => (
              <Link key={`${item.kind}-${item.id}`} href={item.href} className="bolt-activity-row">
                <span className="bolt-document-icon"><FileTypeIcon type={item.type} size={24} /></span>
                <span className="bolt-activity-copy">
                  <strong>{item.name}</strong>
                  <span>{formatBytes(item.size)} • {item.kind === 'sent' ? 'Sent' : 'Downloaded'}</span>
                </span>
                <time dateTime={item.date}>{timeAgo(item.date, currentTime)}</time>
                <ChevronRight className="bolt-activity-chevron" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
      <AppBottomNav />
    </main>
  )
}
