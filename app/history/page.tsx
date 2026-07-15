'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, FileText, Image, Film, Archive,
  Copy, Trash2, Home, ArrowLeftRight,
  Users, Settings, Send, Download, Clock, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

function fileIcon(type: string) {
  if (type?.includes('image')) return <Image size={18} color="#F5C518" />
  if (type?.includes('video')) return <Film size={18} color="#8B5CF6" />
  if (type?.includes('pdf'))   return <FileText size={18} color="#E24B4A" />
  if (type?.includes('zip'))   return <Archive size={18} color="#F5A623" />
  return <FileText size={18} color="#60A5FA" />
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h ago'
  return Math.floor(h / 24) + 'd ago'
}

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
  expires_at: string
  created_at: string
}

export default function HistoryPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [files, setFiles]     = useState<SharedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<Tab>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  async function loadFiles() {
    setLoading(true)
    const { data } = await supabase
      .from('shared_files')
      .select('*')
      .eq('sender_email', user!.email)
      .order('created_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) router.push('/')
  }, [isAuthenticated, isLoadingAuth, router])

  useEffect(() => {
    if (!user) return
    queueMicrotask(() => loadFiles())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function deleteFile(id: string) {
    setDeleting(id)
    try {
      const response = await fetch('/api/delete-from-bunny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Delete failed')
      setFiles(prev => prev.filter(f => f.id !== id))
      toast.success('File deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/receive/${token}`)
    toast.success('Link copied!')
  }

  const isExpired = (f: SharedFile) => new Date(f.expires_at) < new Date()

  const filtered = files.filter(f => {
    if (tab === 'sent')     return f.sender_email === user?.email
    if (tab === 'received') return f.recipient_email === user?.email
    return true
  })

  if (isLoadingAuth || !isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #F5C518', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.25rem 0.75rem' }}>
        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.5rem' }}>History</h2>
        <p style={{ color: '#8A8A8A', fontSize: '0.8rem', marginTop: '2px' }}>{files.length} total transfers</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 1.25rem 1rem' }}>
        {(['all', 'sent', 'received'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              background: tab === t ? '#F5C518' : '#1A1A1A',
              color: tab === t ? '#000' : '#8A8A8A',
              fontSize: '0.8rem', fontWeight: tab === t ? 600 : 400,
              transition: 'all 0.15s', textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* File list */}
      <div style={{ padding: '0 1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Send size={28} color="#555" />
            </div>
            <p style={{ color: '#555', fontSize: '0.875rem', marginBottom: '1rem' }}>No transfers yet</p>
            <Link href="/upload">
              <button style={{ background: '#F5C518', color: '#000', border: 'none', borderRadius: '12px', padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                Send your first file
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(f => (
              <div
                key={f.id}
                style={{ background: '#1A1A1A', border: `0.5px solid ${isExpired(f) ? 'rgba(226,75,74,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', padding: '0.875rem 1rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Icon */}
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {fileIcon(f.file_type)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#8A8A8A' }}>{formatBytes(f.file_size)}</span>
                      <span style={{ fontSize: '0.72rem', color: '#555' }}>·</span>
                      <span style={{ fontSize: '0.72rem', color: isExpired(f) ? '#E24B4A' : '#1D9E75', fontWeight: 500 }}>
                        {isExpired(f) ? 'Expired' : 'Active'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#555' }}>·</span>
                      <span style={{ fontSize: '0.72rem', color: '#555' }}>{timeAgo(f.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {!isExpired(f) && (
                      <button
                        onClick={() => copyLink(f.share_token)}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#242424', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Copy size={14} color="#8A8A8A" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteFile(f.id)}
                      disabled={deleting === f.id}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(226,75,74,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={14} color="#E24B4A" />
                    </button>
                  </div>
                </div>

                {/* Download count */}
                {f.download_count > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                    <Download size={12} color="#555" />
                    <span style={{ fontSize: '0.72rem', color: '#555' }}>{f.download_count} download{f.download_count !== 1 ? 's' : ''}</span>
                    {f.max_downloads && (
                      <span style={{ fontSize: '0.72rem', color: '#555' }}>of {f.max_downloads} max</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0.6rem 0 0.8rem', zIndex: 50 }}>
        {[
          { icon: Home,           label: 'Home',      href: '/dashboard', active: false },
          { icon: ArrowLeftRight, label: 'Transfers', href: '/history',   active: true  },
          { icon: Users,          label: 'Team',      href: '/team',      active: false },
          { icon: Settings,       label: 'Settings',  href: '/settings',  active: false },
        ].map(({ icon: Icon, label, href, active }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', minWidth: '56px' }}>
            <Icon size={22} color={active ? '#F5C518' : '#555'} />
            <span style={{ fontSize: '0.65rem', color: active ? '#F5C518' : '#555', fontWeight: active ? 600 : 400 }}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
