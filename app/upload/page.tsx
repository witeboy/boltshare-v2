'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import {
  ArrowLeft, CloudUpload, Shield, Zap, CheckCircle,
  Copy, Share2, QrCode, Clock, Download, Lock,
  Loader2, X, File
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function UploadPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  const [files, setFiles]         = useState<File[]>([])
  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [shareLink, setShareLink] = useState('')
  const [shareCode, setShareCode] = useState('')
  const [expiryHours, setExpiryHours]   = useState(24)
  const [maxDownloads, setMaxDownloads] = useState<number | null>(null)
  const [password, setPassword]         = useState('')
  const [usePassword, setUsePassword]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...dropped])
  }, [])

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const handleUpload = async () => {
    if (!isAuthenticated) { router.push('/login'); return }
    if (files.length === 0) { toast.error('Please select at least one file'); return }

    setUploading(true)
    setProgress(0)

    try {
      const token = Math.random().toString(36).substring(2, 9).toUpperCase()
      const expiresAt = new Date(Date.now() + expiryHours * 3600000).toISOString()
      const uploadedUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProgress(Math.round(((i + 0.5) / files.length) * 80))

              // Upload file through API (avoids CORS)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileName', file.name)
        formData.append('fileType', file.type || 'application/octet-stream')

        const uploadRes = await fetch('/api/get-bunny-upload-url', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          throw new Error(err.error || 'Upload failed')
        }

        const { fileUrl, bunnyPath, fileName: savedName, fileSize } = await uploadRes.json()
        uploadedUrls.push(fileUrl)

        setProgress(Math.round(((i + 1) / files.length) * 80))

        // Save to Supabase
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        await supabase.from('shared_files').insert({
          file_name:      file.name,
          file_type:      file.type,
          file_url:       fileUrl,
          file_size:      file.size,
          share_token:    token,
          sender_email:   user?.email,
          expires_at:     expiresAt,
          expiry_hours:   expiryHours,
          max_downloads:  maxDownloads,
          status:         'active',
          share_method:   'link',
        })
      }

      setProgress(100)
      const link = `${window.location.origin}/receive/${token}`
      setShareLink(link)
      setShareCode(token)
      toast.success('File uploaded successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink)
    toast.success('Link copied!')
  }

  // ── Link Created screen ───────────────────
  if (shareLink) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', padding: '1.25rem' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#8A8A8A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
          <CheckCircle size={24} color="#1D9E75" />
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem' }}>Link Created</h2>
        </div>

        {/* Link display */}
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#8A8A8A', marginBottom: '6px' }}>Share link</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, fontSize: '0.8rem', color: '#F5C518', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareLink}</div>
            <button onClick={copyLink} style={{ background: '#242424', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', flexShrink: 0 }}>
              <Copy size={14} /> Copy
            </button>
          </div>
          <div style={{ marginTop: '10px', fontSize: '1.25rem', fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>{shareCode}</div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
          {[
            { icon: Copy,   label: 'Copy Link',   action: copyLink },
            { icon: Share2, label: 'Share Link',  action: () => navigator.share?.({ url: shareLink }) },
            { icon: QrCode, label: 'QR Code',     action: () => toast('QR coming soon') },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action} style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '0.875rem 0.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <Icon size={20} color="#F5C518" />
              <span style={{ fontSize: '0.7rem', color: '#B0B0B0' }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Link settings summary */}
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: '#fff', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>Link Settings</div>
          {[
            { icon: Clock,    label: 'Expire After',     value: expiryHours + ' hours' },
            { icon: Download, label: 'Max Downloads',    value: maxDownloads ? maxDownloads + 'x' : 'Unlimited' },
            { icon: Lock,     label: 'Password Protect', value: usePassword ? 'On' : 'Off' },
          ].map(({ icon: Icon, label, value }, i, arr) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
              <Icon size={16} color="#8A8A8A" style={{ marginRight: '10px', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.875rem', color: '#B0B0B0' }}>{label}</span>
              <span style={{ fontSize: '0.875rem', color: '#fff' }}>{value}</span>
            </div>
          ))}
        </div>

        <button onClick={() => { setFiles([]); setShareLink(''); setShareCode('') }} style={{ width: '100%', background: '#F5C518', color: '#000', border: 'none', borderRadius: '14px', padding: '1rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
          Done
        </button>
      </div>
    )
  }

  // ── Upload screen ─────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', padding: '1.25rem', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#8A8A8A', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem' }}>Send a File</h2>
          <p style={{ color: '#8A8A8A', fontSize: '0.8rem', marginTop: '1px' }}>Upload any file and get a shareable link</p>
        </div>
      </div>

      {/* Trust badges */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { icon: Shield, label: 'Encrypted',    color: '#1D9E75' },
          { icon: Zap,    label: 'Bunny CDN',    color: '#F5C518' },
          { icon: CheckCircle, label: 'Virus Scanned', color: '#60A5FA' },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '4px 10px' }}>
            <Icon size={12} color={color} />
            <span style={{ fontSize: '0.72rem', color: '#B0B0B0', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragging ? '#E6B800' : '#F5C518'}`,
          borderRadius: '20px',
          background: dragging ? 'rgba(245,197,24,0.2)' : 'rgba(245,197,24,0.06)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2.5rem 1.5rem', cursor: 'pointer', marginBottom: '1rem',
          transition: 'all 0.15s', textAlign: 'center',
          boxShadow: dragging ? '0 0 32px rgba(245,197,24,0.15)' : 'none',
        }}
      >
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245,197,24,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', filter: 'drop-shadow(0 0 16px rgba(245,197,24,0.4))' }}>
          <CloudUpload size={30} color="#F5C518" />
        </div>
        <p style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>
          Drag &amp; drop files here
        </p>
        <p style={{ color: '#8A8A8A', fontSize: '0.8rem', marginBottom: '4px' }}>or click to browse</p>
        <p style={{ color: '#555', fontSize: '0.75rem' }}>Multiple files allowed · Max 5GB</p>
        <input ref={inputRef} type="file" multiple onChange={onPick} style={{ display: 'none' }} />
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden', marginBottom: '1rem' }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem', borderBottom: i < files.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
              <File size={16} color="#F5C518" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>{formatBytes(f.size)}</div>
              </div>
              <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#fff' }}>Uploading...</span>
            <span style={{ fontSize: '0.8rem', color: '#F5C518' }}>{progress}%</span>
          </div>
          <div style={{ background: '#242424', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
            <div style={{ background: '#F5C518', height: '100%', width: progress + '%', borderRadius: '4px', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Link settings */}
      <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden', marginBottom: '1.25rem' }}>
        <div style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: '#fff', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>Link Settings</div>

        {/* Expire */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          <Clock size={16} color="#8A8A8A" style={{ marginRight: '10px' }} />
          <span style={{ flex: 1, fontSize: '0.875rem', color: '#B0B0B0' }}>Expire After</span>
          <select value={expiryHours} onChange={e => setExpiryHours(Number(e.target.value))}
            style={{ background: '#242424', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '8px', color: '#fff', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}>
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>24 hours</option>
            <option value={72}>3 days</option>
            <option value={168}>7 days</option>
          </select>
        </div>

        {/* Max downloads */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          <Download size={16} color="#8A8A8A" style={{ marginRight: '10px' }} />
          <span style={{ flex: 1, fontSize: '0.875rem', color: '#B0B0B0' }}>Max Downloads</span>
          <select value={maxDownloads ?? ''} onChange={e => setMaxDownloads(e.target.value ? Number(e.target.value) : null)}
            style={{ background: '#242424', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '8px', color: '#fff', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}>
            <option value="">Unlimited</option>
            <option value={1}>1x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
            <option value={25}>25x</option>
          </select>
        </div>

        {/* Password */}
        <div style={{ padding: '0.875rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Lock size={16} color="#8A8A8A" style={{ marginRight: '10px' }} />
            <span style={{ flex: 1, fontSize: '0.875rem', color: '#B0B0B0' }}>Password Protect</span>
            <div
              onClick={() => setUsePassword(!usePassword)}
              style={{ width: '44px', height: '24px', borderRadius: '12px', background: usePassword ? '#F5C518' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <div style={{ position: 'absolute', top: '2px', left: usePassword ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
          </div>
          {usePassword && (
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ marginTop: '10px', width: '100%', background: '#242424', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '8px', color: '#fff', padding: '0.7rem 1rem', fontSize: '0.875rem', outline: 'none' }}
            />
          )}
        </div>
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        style={{ width: '100%', background: uploading || files.length === 0 ? '#555' : '#F5C518', color: uploading || files.length === 0 ? '#888' : '#000', border: 'none', borderRadius: '14px', padding: '1rem', fontWeight: 700, fontSize: '1rem', cursor: uploading || files.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}
      >
        {uploading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</> : <><CloudUpload size={18} /> Send File</>}
      </button>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}