'use client'

import { use, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Download, Clock, Globe,
  BarChart2, Lock, FileText, Image,
  Film, Archive, Copy, Trash2, Loader2
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

function fileIcon(type: string, size = 20) {
  if (type?.includes('image')) return <Image size={size} color="#F5C518" />
  if (type?.includes('video')) return <Film size={size} color="#8B5CF6" />
  if (type?.includes('pdf'))   return <FileText size={size} color="#E24B4A" />
  if (type?.includes('zip'))   return <Archive size={size} color="#F5A623" />
  return <FileText size={size} color="#60A5FA" />
}

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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

// Simple bar chart — no external library needed
function MiniBarChart({ data }: { data: { day: string; downloads: number }[] }) {
  const max = Math.max(...data.map(d => d.downloads), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px', padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
          <div
            style={{
              width: '100%',
              background: d.downloads > 0 ? '#F5C518' : '#242424',
              borderRadius: '3px 3px 0 0',
              height: `${Math.max((d.downloads / max) * 100, d.downloads > 0 ? 8 : 4)}%`,
              transition: 'height 0.3s',
              opacity: d.downloads > 0 ? 1 : 0.4,
            }}
          />
          <span style={{ fontSize: '9px', color: '#555', whiteSpace: 'nowrap' }}>{d.day}</span>
        </div>
      ))}
    </div>
  )
}

export default function FileAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const [file, setFile]     = useState<any>(null)
  const [logs, setLogs]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) router.push('/')
  }, [isAuthenticated, isLoadingAuth])

  useEffect(() => {
    if (!user || !id) return
    loadData()
  }, [user, id])

  async function loadData() {
    setLoading(true)
    const [{ data: fileData }, { data: logData }] = await Promise.all([
      supabase.from('shared_files').select('*').eq('id', id).single(),
      supabase.from('download_logs').select('*').eq('file_id', id).order('downloaded_at', { ascending: false }).limit(100),
    ])
    setFile(fileData)
    setLogs(logData || [])
    setLoading(false)
  }

  // Build last 7 days chart
  const chartData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const count = logs.filter(log => {
        const logDate = new Date(log.downloaded_at)
        return logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dayStr
      }).length
      days.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), downloads: count })
    }
    return days
  }, [logs])

  async function copyLink() {
    if (!file) return
    navigator.clipboard.writeText(`${window.location.origin}/receive/${file.share_token}`)
    toast.success('Link copied!')
  }

  async function deleteFile() {
    if (!file) return
    setDeleting(true)
    try {
      await supabase.from('shared_files').delete().eq('id', file.id)
      if (file.bunny_path) {
        await fetch('/api/delete-from-bunny', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bunnyPath: file.bunny_path }),
        })
      }
      toast.success('File deleted')
      router.push('/history')
    } catch {
      toast.error('Delete failed')
      setDeleting(false)
    }
  }

  const isExpired = file && new Date(file.expires_at) < new Date()

  if (isLoadingAuth || !isAuthenticated || loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #F5C518', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!file) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#555' }}>File not found.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', paddingBottom: '2rem' }}>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#8A8A8A', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.15rem' }}>File Analytics</h2>
      </div>

      <div style={{ padding: '0 1.25rem' }}>

        {/* File card */}
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {fileIcon(file.file_type)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</div>
              <div style={{ fontSize: '0.75rem', color: '#8A8A8A', marginTop: '2px' }}>{formatBytes(file.file_size)}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {!isExpired && (
                <button onClick={copyLink} style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#242424', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Copy size={14} color="#8A8A8A" />
                </button>
              )}
              <button onClick={deleteFile} disabled={deleting} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(226,75,74,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {deleting ? <Loader2 size={14} color="#E24B4A" style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} color="#E24B4A" />}
              </button>
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Status',    value: isExpired ? 'Expired' : 'Active', color: isExpired ? '#E24B4A' : '#1D9E75' },
              { label: 'Downloads', value: file.download_count || 0 },
              { label: 'Expires',   value: new Date(file.expires_at).toLocaleDateString() },
              { label: 'Max DL',    value: file.max_downloads || 'Unlimited' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#242424', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: (color as string) || '#fff' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Downloads chart */}
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <BarChart2 size={15} color="#F5C518" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>Downloads — last 7 days</span>
          </div>
          <MiniBarChart data={chartData} />
        </div>

        {/* Download log */}
        {logs.length > 0 && (
          <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: '#fff', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              Download History
            </div>
            {logs.slice(0, 20).map((log, i) => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem', borderBottom: i < Math.min(logs.length, 20) - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
                <Download size={14} color="#555" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: '#B0B0B0' }}>{log.receiver_email || 'Anonymous'}</div>
                  {log.ip_address && <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '1px' }}>{log.ip_address}</div>}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#555', flexShrink: 0 }}>{timeAgo(log.downloaded_at)}</div>
              </div>
            ))}
          </div>
        )}

        {logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#555' }}>
            <Download size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p style={{ fontSize: '0.875rem' }}>No downloads yet</p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
