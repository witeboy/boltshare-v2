'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Archive, Download, FileText, Film, Image as ImageIcon, Loader2, Lock, Shield, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

type SharedFile = {
  id: string
  file_name: string
  file_type: string
  file_url: string
  file_size: number
  status: string
  expires_at: string
  max_downloads: number | null
  download_count: number | null
  password_hash: string | null
}

function fileIcon(type: string, size = 28) {
  if (type?.includes('image')) return <ImageIcon size={size} color="#F5C518" />
  if (type?.includes('video')) return <Film size={size} color="#8B5CF6" />
  if (type?.includes('pdf')) return <FileText size={size} color="#E24B4A" />
  if (type?.includes('zip')) return <Archive size={size} color="#F5A623" />
  return <FileText size={size} color="#60A5FA" />
}

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function availabilityError(files: SharedFile[]) {
  const firstFile = files[0]
  if (!firstFile) return 'This link is invalid or has been removed.'
  if (firstFile.status !== 'active') return 'This file has been deleted by the sender.'
  if (new Date(firstFile.expires_at) < new Date()) return 'This link has expired.'
  if (firstFile.max_downloads && (firstFile.download_count ?? 0) >= firstFile.max_downloads) {
    return 'This link has reached its maximum number of downloads.'
  }
  return 'This link is unavailable.'
}

export default function ReceivePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const supabase = createClient()
  const [files, setFiles] = useState<SharedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [pwLocked, setPwLocked] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadFiles() {
      const { data, error: queryError } = await supabase
        .from('shared_files')
        .select('id, file_name, file_type, file_url, file_size, status, expires_at, max_downloads, download_count, password_hash')
        .eq('share_token', token)
        .order('created_at', { ascending: true })

      const sharedFiles = (data ?? []) as SharedFile[]
      const activeFiles = sharedFiles.filter(file =>
        file.status === 'active' &&
        new Date(file.expires_at) >= new Date() &&
        (!file.max_downloads || (file.download_count ?? 0) < file.max_downloads)
      )

      if (queryError || activeFiles.length === 0) {
        setError(availabilityError(sharedFiles))
        setLoading(false)
        return
      }

      setFiles(activeFiles)
      setPwLocked(activeFiles.some(file => Boolean(file.password_hash)))
      setLoading(false)
    }

    loadFiles()
  }, [supabase, token])

  async function handleDownload(file: SharedFile) {
    if (pwLocked) {
      const passwordResponse = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const passwordPayload = await passwordResponse.json()

      if (!passwordResponse.ok || !passwordPayload.valid) {
        toast.error(passwordPayload.error || 'Wrong password')
        return
      }

      setPwLocked(false)
    }

    setDownloadingId(file.id)
    try {
      const trackingResponse = await fetch('/api/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id }),
      })
      const trackingPayload = await trackingResponse.json()

      if (!trackingResponse.ok) throw new Error(trackingPayload.error || 'Download could not be started')

      const anchor = document.createElement('a')
      anchor.href = file.file_url
      anchor.download = file.file_name
      anchor.target = '_blank'
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      toast.success(`${file.file_name} is downloading`)
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : 'Download failed. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div aria-label="Loading shared files" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #F5C518', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(226,75,74,0.12)', border: '0.5px solid rgba(226,75,74,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <AlertTriangle size={28} color="#E24B4A" />
        </div>
        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.15rem', marginBottom: '8px' }}>Link unavailable</h2>
        <p style={{ color: '#8A8A8A', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{error}</p>
        <Link href="/" style={{ color: '#F5C518', fontSize: '0.875rem' }}>Go to BoltShare</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <main style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '2rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#000" fill="#000" />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>BoltShare Receiver</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(245,197,24,0.08)', border: '0.5px solid rgba(245,197,24,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', filter: 'drop-shadow(0 0 24px rgba(245,197,24,0.3))' }}>
            <Shield size={52} color="#F5C518" fill="rgba(245,197,24,0.15)" />
          </div>
          <h1 style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem', marginTop: '1rem' }}>
            You received {files.length === 1 ? 'a file' : `${files.length} files`}
          </h1>
          <p style={{ color: '#8A8A8A', fontSize: '0.875rem', marginTop: '4px' }}>Shared securely via BoltShare</p>
        </div>

        {pwLocked && (
          <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Lock size={16} color="#F5C518" />
              <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500 }}>Password required for this share</span>
            </div>
            <input type="password" placeholder="Enter password" value={password} onChange={event => setPassword(event.target.value)}
              style={{ width: '100%', background: '#242424', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '10px', color: '#fff', padding: '0.8rem 1rem', fontSize: '0.9rem', outline: 'none' }} />
          </div>
        )}

        <section aria-label="Shared files" style={{ display: 'grid', gap: '0.75rem' }}>
          {files.map(file => {
            const isDownloading = downloadingId === file.id
            return (
              <article key={file.id} style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '1.125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {fileIcon(file.file_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#8A8A8A', marginTop: '3px' }}>{formatBytes(file.file_size)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.72rem', color: '#8A8A8A' }}>Expires {new Date(file.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <button onClick={() => handleDownload(file)} disabled={Boolean(downloadingId)}
                  style={{ width: '100%', background: isDownloading ? '#B8960F' : '#F5C518', color: '#000', border: 'none', borderRadius: '12px', padding: '0.8rem', fontWeight: 700, fontSize: '0.9rem', cursor: downloadingId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                  {isDownloading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Preparing download...</> : <><Download size={18} /> Download</>}
                </button>
              </article>
            )
          })}
        </section>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '1rem' }}>
          {['Secure link', 'Bunny CDN', 'Auto-expiring'].map(label => <span key={label} style={{ fontSize: '0.68rem', color: '#555' }}>{label}</span>)}
        </div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
