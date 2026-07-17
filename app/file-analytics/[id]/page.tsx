'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Archive,
  ArrowLeft,
  CalendarClock,
  Check,
  Copy,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Share2,
  Trash2,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { APP_URL } from '@/lib/config'

interface SharedFile {
  id: string
  file_name: string
  file_type: string
  file_size: number
  share_token: string
  sender_email: string
  download_count: number
  max_downloads: number | null
  password_hash: string | null
  status: string
  expires_at: string
  created_at: string
}

interface DownloadLog {
  id: string
  downloaded_at: string
  ip_address: string | null
  receiver_email: string | null
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
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return `${Math.floor(hours / 24)}d ago`
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString))
}

function FileTypeIcon({ type, size = 20 }: { type: string; size?: number }) {
  if (type?.includes('image')) return <ImageIcon size={size} color="#ffc916" />
  if (type?.includes('video')) return <Film size={size} color="#9d84ff" />
  if (type?.includes('pdf')) return <FileText size={size} color="#ff6868" />
  if (type?.includes('zip') || type?.includes('archive')) return <Archive size={size} color="#ffb638" />
  return <FileText size={size} color="#75a7ff" />
}

function Sparkline({ values }: { values: number[] }) {
  const width = 120
  const height = 38
  const maximum = Math.max(...values, 1)
  const denominator = Math.max(values.length - 1, 1)
  const points = values
    .map((value, index) => {
      const x = (index / denominator) * width
      const y = height - 3 - (value / maximum) * (height - 8)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="38" role="img" aria-label="Seven day activity trend">
      <polyline
        points={points}
        fill="none"
        stroke="#ffc916"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function LoadingScreen() {
  return (
    <div className="premium-page" style={{ display: 'grid', placeItems: 'center' }}>
      <div className="premium-spinner" aria-label="Loading file details" />
    </div>
  )
}

export default function FileAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [file, setFile] = useState<SharedFile | null>(null)
  const [logs, setLogs] = useState<DownloadLog[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fileActive, setFileActive] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)

    const [{ data: fileData, error: fileError }, { data: logData, error: logError }] = await Promise.all([
      supabase
        .from('shared_files')
        .select('id,file_name,file_type,file_size,share_token,sender_email,download_count,max_downloads,password_hash,status,expires_at,created_at')
        .eq('id', id)
        .single(),
      supabase
        .from('download_logs')
        .select('id,downloaded_at,ip_address,receiver_email')
        .eq('file_id', id)
        .order('downloaded_at', { ascending: false })
        .limit(100),
    ])

    if (fileError) {
      console.error('Unable to load shared file:', fileError)
      setFile(null)
    } else {
      const loadedFile = fileData as SharedFile
      setFile(loadedFile)
      setFileActive(
        loadedFile.status === 'active' &&
          new Date(loadedFile.expires_at).getTime() > Date.now(),
      )
    }

    if (logError) {
      console.error('Unable to load download activity:', logError)
      setLogs([])
    } else {
      setLogs((logData ?? []) as DownloadLog[])
    }

    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, isLoadingAuth, router])

  useEffect(() => {
    if (!user || !id) return
    queueMicrotask(() => {
      void loadData()
    })
  }, [id, loadData, user])

  const activityByDay = useMemo(() => {
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - offset))

      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)

      return logs.filter((log) => {
        const downloadedAt = new Date(log.downloaded_at)
        return downloadedAt >= date && downloadedAt < nextDay
      }).length
    })
  }, [logs])

  const uniqueRecipients = useMemo(() => {
    const identities = logs.map((log) => log.receiver_email || log.ip_address).filter(Boolean)
    return new Set(identities).size
  }, [logs])

  const uniqueRecipientsByDay = useMemo(() => {
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - offset))

      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)

      const identities = logs
        .filter((log) => {
          const downloadedAt = new Date(log.downloaded_at)
          return downloadedAt >= date && downloadedAt < nextDay
        })
        .map((log) => log.receiver_email || log.ip_address)
        .filter(Boolean)

      return new Set(identities).size
    })
  }, [logs])

  const secureLink = file
    ? `${APP_URL.replace(/\/$/, '')}/receive/${file.share_token}`
    : ''

  const isActive = fileActive

  async function copyLink() {
    if (!file) return

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/receive/${file.share_token}`)
      setCopied(true)
      toast.success('Secure link copied')
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error('Unable to copy secure link:', error)
      toast.error('The link could not be copied')
    }
  }

  async function shareLink() {
    if (!file) return

    const url = `${window.location.origin}/receive/${file.share_token}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: file.file_name,
          text: 'A secure BoltShare file was shared with you.',
          url,
        })
        return
      }

      await navigator.clipboard.writeText(url)
      toast.success('Secure link copied for sharing')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Unable to share secure link:', error)
      toast.error('The link could not be shared')
    }
  }

  async function deleteFile() {
    if (!file || deleting) return

    const confirmed = window.confirm(`Delete “${file.file_name}”? This cannot be undone.`)
    if (!confirmed) return

    setDeleting(true)
    setMenuOpen(false)

    try {
      const response = await fetch('/api/delete-from-bunny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Delete failed')
      }

      toast.success('File deleted')
      router.push('/history')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
      setDeleting(false)
    }
  }

  if (isLoadingAuth || !isAuthenticated || loading) {
    return <LoadingScreen />
  }

  if (!file) {
    return (
      <main className="premium-page">
        <div className="premium-shell" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <FileText size={34} color="#656a70" style={{ margin: '0 auto' }} />
            <h1 style={{ marginTop: '1rem', fontSize: '1.35rem' }}>File not found</h1>
            <button type="button" className="premium-secondary-button" onClick={() => router.push('/history')} style={{ marginTop: '1rem', minWidth: 190 }}>
              Back to transfers
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="premium-page">
      <div className="premium-dashboard-shell premium-enter" style={{ paddingBottom: '2.2rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" className="premium-icon-button" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

          <div style={{ position: 'relative' }}>
            <button type="button" className="premium-icon-button" onClick={() => setMenuOpen((current) => !current)} aria-label="Open file actions">
              <MoreHorizontal size={21} />
            </button>

            {menuOpen && (
              <div className="premium-action-menu">
                <button type="button" onClick={() => void deleteFile()} disabled={deleting}>
                  {deleting ? <Loader2 size={15} style={{ animation: 'premium-spin 800ms linear infinite' }} /> : <Trash2 size={15} />}
                  Delete file
                </button>
              </div>
            )}
          </div>
        </header>

        <section style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="premium-file-icon" style={{ width: 48, height: 48, borderRadius: 12 }}>
              <FileTypeIcon type={file.file_type} size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ overflow: 'hidden', fontSize: '0.95rem', letterSpacing: '-0.015em', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.file_name}
              </h1>
              <p style={{ marginTop: '0.2rem', color: '#777c81', fontSize: '0.7rem' }}>{formatBytes(file.file_size)}</p>
            </div>
          </div>
        </section>

        <section className="premium-dashboard-card" style={{ marginTop: '1rem', padding: '0.85rem 0.95rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.38rem', color: isActive ? 'var(--bs-success)' : '#8b9095', fontSize: '0.78rem', fontWeight: 680 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? 'var(--bs-success)' : '#666b70', boxShadow: isActive ? '0 0 12px rgba(69,199,142,0.4)' : 'none' }} />
                {isActive ? 'Link is active' : 'Link is inactive'}
              </div>
              <p style={{ marginTop: '0.22rem', color: '#656a70', fontSize: '0.63rem' }}>Created {formatDate(file.created_at)}</p>
            </div>
            <span className={isActive ? 'bs-badge bs-badge-green' : 'bs-badge'}>{isActive ? 'Live' : 'Expired'}</span>
          </div>
        </section>

        <section className="premium-dashboard-card" style={{ marginTop: '0.72rem', padding: '0 0.95rem' }}>
          <div className="premium-detail-row">
            <span className="premium-detail-label">Link</span>
            <button
              type="button"
              onClick={() => void copyLink()}
              style={{ display: 'flex', minWidth: 0, maxWidth: '70%', alignItems: 'center', gap: '0.45rem', border: 0, background: 'transparent', color: '#deded9', cursor: 'pointer', fontSize: '0.72rem' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{secureLink.replace(/^https?:\/\//, '')}</span>
              {copied ? <Check size={14} color="var(--bs-success)" /> : <Copy size={14} />}
            </button>
          </div>
          <div className="premium-detail-row">
            <span className="premium-detail-label">Expires</span>
            <span className="premium-detail-value">{formatDate(file.expires_at)}</span>
          </div>
          <div className="premium-detail-row">
            <span className="premium-detail-label">Password protection</span>
            <span className="premium-detail-value">{file.password_hash ? 'Enabled' : 'Not enabled'}</span>
          </div>
          <div className="premium-detail-row">
            <span className="premium-detail-label">Allowed downloads</span>
            <span className="premium-detail-value">{file.max_downloads ?? 'Unlimited'}</span>
          </div>
          <div className="premium-detail-row">
            <span className="premium-detail-label">Created by</span>
            <span className="premium-detail-value">{file.sender_email}</span>
          </div>
        </section>

        <section style={{ marginTop: '1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.58rem' }}>
            <h2 style={{ fontSize: '0.82rem' }}>Analytics</h2>
            <span style={{ color: '#6e7378', fontSize: '0.65rem' }}>Last seven days</span>
          </div>

          <div className="premium-analytics-grid">
            <div className="premium-analytics-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Users size={15} color="#8d9297" />
                <span style={{ color: '#676c71', fontSize: '0.61rem' }}>Recipients</span>
              </div>
              <div style={{ marginTop: '0.55rem', color: '#f1f1ed', fontSize: '1.42rem', fontWeight: 760 }}>{uniqueRecipients}</div>
              <Sparkline values={uniqueRecipientsByDay} />
            </div>

            <div className="premium-analytics-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Download size={15} color="#8d9297" />
                <span style={{ color: '#676c71', fontSize: '0.61rem' }}>Downloads</span>
              </div>
              <div style={{ marginTop: '0.55rem', color: '#f1f1ed', fontSize: '1.42rem', fontWeight: 760 }}>{file.download_count ?? logs.length}</div>
              <Sparkline values={activityByDay} />
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gap: '0.65rem', marginTop: '1.15rem' }}>
          <button type="button" className="premium-primary-button" onClick={() => void copyLink()} disabled={!isActive}>
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {copied ? 'Link copied' : 'Copy secure link'}
          </button>
          <button type="button" className="premium-secondary-button" onClick={() => void shareLink()} disabled={!isActive}>
            <Share2 size={17} />
            Share link
          </button>
        </section>

        <section style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.58rem' }}>
            <Activity size={15} color="var(--bs-gold)" />
            <h2 style={{ fontSize: '0.82rem' }}>Download activity</h2>
          </div>

          <div className="premium-dashboard-card" style={{ overflow: 'hidden' }}>
            {logs.length === 0 ? (
              <div style={{ padding: '1.7rem 1rem', textAlign: 'center' }}>
                <Download size={24} color="#555b62" style={{ margin: '0 auto' }} />
                <p style={{ marginTop: '0.45rem', color: '#6d7277', fontSize: '0.74rem' }}>No downloads yet</p>
              </div>
            ) : (
              logs.slice(0, 20).map((log) => (
                <div key={log.id} className="premium-file-row" style={{ cursor: 'default' }}>
                  <span className="premium-file-icon" style={{ width: 34, height: 34 }}>
                    <Download size={15} color="#8d9297" />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', overflow: 'hidden', color: '#dededa', fontSize: '0.74rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.receiver_email || 'Anonymous recipient'}
                    </span>
                    <span style={{ display: 'block', marginTop: '0.15rem', color: '#666b70', fontSize: '0.62rem' }}>
                      {log.ip_address || 'Private network'}
                    </span>
                  </span>
                  <span style={{ color: '#666b70', fontSize: '0.62rem' }}>{timeAgo(log.downloaded_at)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="premium-dashboard-card" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.8rem', padding: '0.8rem 0.9rem' }}>
          <CalendarClock size={15} color="#777c81" />
          <p style={{ color: '#6f7479', fontSize: '0.65rem' }}>
            BoltShare will automatically remove this file after its expiry date.
          </p>
        </section>
      </div>
    </main>
  )
}
