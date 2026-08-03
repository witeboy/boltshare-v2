'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Download, Send, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import AppBottomNav from '@/components/boltshare/AppBottomNav'
import AppHeader from '@/components/boltshare/AppHeader'
import FileTypeIcon from '@/components/boltshare/FileTypeIcon'
import { useAuth } from '@/lib/AuthContext'
import { getReceivedTransfers, type ReceivedTransfer } from '@/lib/received-history'
import { createClient } from '@/lib/supabase/client'

function timeAgo(dateString: string, currentTime: number) {
  const difference = Math.max(0, currentTime - new Date(dateString).getTime())
  const minutes = Math.floor(difference / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 MB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

type Tab = 'all' | 'sent' | 'received'

interface SharedFile {
  id: string
  file_name: string
  file_type: string
  file_size: number
  share_token: string
  sender_email: string
  recipient_email: string | null
  download_count: number
  max_downloads: number | null
  status: string
  expires_at: string
  created_at: string
}

type ActivityItem =
  | { kind: 'sent'; date: string; file: SharedFile }
  | { kind: 'received'; date: string; file: ReceivedTransfer }

export default function HistoryPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [files, setFiles] = useState<SharedFile[]>([])
  const [received] = useState<ReceivedTransfer[]>(getReceivedTransfers)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) router.replace('/')
  }, [isAuthenticated, isLoadingAuth, router])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!user?.email) return
    let cancelled = false
    async function loadFiles() {
      setLoading(true)
      const { data, error } = await supabase
        .from('shared_files')
        .select('id,file_name,file_type,file_size,share_token,sender_email,recipient_email,download_count,max_downloads,status,expires_at,created_at')
        .eq('sender_email', user!.email)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        console.error('Unable to load transfer history:', error)
        setFiles([])
      } else {
        setFiles((data ?? []) as SharedFile[])
      }
      setLoading(false)
    }
    void loadFiles()
    return () => { cancelled = true }
  }, [supabase, user])

  async function deleteFile(id: string) {
    setDeleting(id)
    try {
      const response = await fetch('/api/delete-from-bunny', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Delete failed')
      setFiles(current => current.filter(file => file.id !== id))
      toast.success('File deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/receive/${token}`)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  const sentItems: ActivityItem[] = files.map(file => ({ kind: 'sent', date: file.created_at, file }))
  const receivedItems: ActivityItem[] = received.map(file => ({ kind: 'received', date: file.downloadedAt, file }))
  const items = (tab === 'sent' ? sentItems : tab === 'received' ? receivedItems : [...sentItems, ...receivedItems])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (isLoadingAuth || !isAuthenticated) {
    return <div className="bolt-page bolt-loading-screen"><div className="premium-spinner" aria-label="Loading transfer history" /></div>
  }

  return (
    <main className="bolt-page bolt-page-with-nav">
      <div className="bolt-page-shell premium-enter">
        <AppHeader title="Activity" />
        <section className="bolt-subpage-intro">
          <h1>Transfer history</h1>
          <p>{files.length + received.length} total sent and received files</p>
        </section>
        <div className="bolt-tabs" role="tablist" aria-label="Transfer type">
          {(['all', 'sent', 'received'] as Tab[]).map(value => (
            <button key={value} type="button" role="tab" aria-selected={tab === value}
              className={tab === value ? 'is-active' : ''} onClick={() => setTab(value)}>{value}</button>
          ))}
        </div>

        <section className="bolt-history-list" aria-live="polite">
          {loading ? (
            <div className="bolt-list-empty">Loading activity…</div>
          ) : items.length === 0 ? (
            <div className="bolt-list-empty">
              <Send size={30} aria-hidden="true" />
              <strong>No transfers yet</strong>
              <span>Your sent and received files will appear here.</span>
              <Link href="/upload">Send your first file</Link>
            </div>
          ) : items.map(item => {
            if (item.kind === 'received') {
              const file = item.file
              return (
                <article key={`received-${file.id}`} className="bolt-history-row">
                  <Link href={`/receive/${encodeURIComponent(file.token)}`} className="bolt-history-main">
                    <span className="bolt-history-icon"><FileTypeIcon type={file.fileType} /></span>
                    <span className="bolt-history-copy">
                      <strong>{file.fileName}</strong>
                      <span>{formatBytes(file.fileSize)} • Downloaded • {timeAgo(file.downloadedAt, currentTime)}</span>
                    </span>
                  </Link>
                  <span className="bolt-history-status is-received"><Download aria-hidden="true" />Received</span>
                </article>
              )
            }

            const file = item.file
            const expired = file.status !== 'active' || new Date(file.expires_at).getTime() <= currentTime
            return (
              <article key={`sent-${file.id}`} className="bolt-history-row">
                <Link href={`/file-analytics/${file.id}`} className="bolt-history-main">
                  <span className="bolt-history-icon"><FileTypeIcon type={file.file_type} /></span>
                  <span className="bolt-history-copy">
                    <strong>{file.file_name}</strong>
                    <span>{formatBytes(file.file_size)} • {expired ? 'Expired' : 'Sent'} • {timeAgo(file.created_at, currentTime)}</span>
                  </span>
                </Link>
                <div className="bolt-history-actions">
                  {!expired ? <button type="button" onClick={() => void copyLink(file.share_token)} aria-label={`Copy link for ${file.file_name}`}><Copy aria-hidden="true" /></button> : null}
                  <button type="button" className="is-danger" disabled={deleting === file.id}
                    onClick={() => void deleteFile(file.id)} aria-label={`Delete ${file.file_name}`}><Trash2 aria-hidden="true" /></button>
                </div>
              </article>
            )
          })}
        </section>
      </div>
      <AppBottomNav />
    </main>
  )
}
