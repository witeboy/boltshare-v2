'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import {
  ArrowLeft, CloudUpload, Shield, Zap, CheckCircle,
  Copy, Share2, QrCode, Clock, Download, Lock,
  Loader2, X, File
} from 'lucide-react'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import { TRANSFER_TTL_HOURS } from '@/lib/config'

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  if (bytes < 1024 * 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
  return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1) + ' TB'
}

type UploadAuthorization = {
  objectPath: string
  uploadId: string
  partSize: number
  partCount: number
}

type CompletedPart = {
  partNumber: number
  etag: string
}

const PART_URL_BATCH_SIZE = 50
const UPLOAD_CONCURRENCY = 4
const RETRY_DELAYS = [0, 2_000, 5_000, 10_000, 20_000]

async function requestPartUrls(authorization: UploadAuthorization, partNumbers: number[]) {
  const response = await fetch('/api/uploads/part-urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      objectPath: authorization.objectPath,
      uploadId: authorization.uploadId,
      partNumbers,
    }),
  })
  const result = await response.json()
  if (!response.ok || !Array.isArray(result.urls)) {
    throw new Error(result.error || 'Upload parts could not be prepared')
  }
  return new Map<number, string>(
    result.urls.map((entry: { partNumber: number; url: string }) => [entry.partNumber, entry.url]),
  )
}

function putPart(
  url: string,
  data: Blob,
  onProgress: (uploaded: number) => void,
) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', url)
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(event.loaded)
    }
    request.onerror = () => reject(new Error('The network interrupted this upload part'))
    request.onabort = () => reject(new Error('The upload was cancelled'))
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`Storage rejected an upload part (${request.status})`))
        return
      }
      const etag = request.getResponseHeader('ETag')
      if (!etag) {
        reject(new Error('Storage did not confirm an upload part'))
        return
      }
      onProgress(data.size)
      resolve(etag)
    }
    request.send(data)
  })
}

async function uploadPartWithRetry(
  file: File,
  authorization: UploadAuthorization,
  partNumber: number,
  initialUrl: string,
  onProgress: (uploaded: number) => void,
) {
  const start = (partNumber - 1) * authorization.partSize
  const data = file.slice(start, Math.min(start + authorization.partSize, file.size))
  let url = initialUrl
  let lastError: unknown

  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    try {
      if (RETRY_DELAYS[attempt]) {
        await new Promise(resolve => window.setTimeout(resolve, RETRY_DELAYS[attempt]))
        url = (await requestPartUrls(authorization, [partNumber])).get(partNumber) || ''
      }
      if (!url) throw new Error('The upload part URL is missing')
      return await putPart(url, data, onProgress)
    } catch (error) {
      lastError = error
      onProgress(0)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('An upload part repeatedly failed')
}

async function uploadDirectly(
  file: File,
  authorization: UploadAuthorization,
  onProgress: (uploaded: number, total: number) => void,
) {
  const completedParts: CompletedPart[] = []
  const progressByPart = new Map<number, number>()
  const reportProgress = (partNumber: number, uploaded: number) => {
    progressByPart.set(partNumber, uploaded)
    onProgress(
      Array.from(progressByPart.values()).reduce((total, value) => total + value, 0),
      file.size,
    )
  }

  for (let batchStart = 1; batchStart <= authorization.partCount; batchStart += PART_URL_BATCH_SIZE) {
    const partNumbers = Array.from(
      { length: Math.min(PART_URL_BATCH_SIZE, authorization.partCount - batchStart + 1) },
      (_, index) => batchStart + index,
    )
    const urls = await requestPartUrls(authorization, partNumbers)
    let nextIndex = 0

    const worker = async () => {
      while (nextIndex < partNumbers.length) {
        const partNumber = partNumbers[nextIndex++]
        const etag = await uploadPartWithRetry(
          file,
          authorization,
          partNumber,
          urls.get(partNumber) || '',
          uploaded => reportProgress(partNumber, uploaded),
        )
        completedParts.push({ partNumber, etag })
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, partNumbers.length) }, () => worker()),
    )
  }

  return completedParts.sort((a, b) => a.partNumber - b.partNumber)
}

const SHARE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function createShareCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, byte => SHARE_CODE_ALPHABET[byte % SHARE_CODE_ALPHABET.length]).join('')
}

async function hashPassword(password: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
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
  const [expiresAt, setExpiresAt] = useState('')
  const [maxDownloads, setMaxDownloads] = useState<number | null>(null)
  const [password, setPassword]         = useState('')
  const [usePassword, setUsePassword]   = useState(false)
  const [showQr, setShowQr] = useState(false)
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
    if (!isAuthenticated) { router.push('/'); return }
    if (files.length === 0) { toast.error('Please select at least one file'); return }
    if (files.some(file => file.size <= 0)) { toast.error('Empty files cannot be uploaded'); return }
    if (usePassword && password.trim().length < 8) {
      toast.error('Use at least 8 characters for a protected share')
      return
    }
    if (!user?.email) {
      toast.error('Your account is missing an email address. Please sign in again.')
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const token = createShareCode()
      const passwordHash = usePassword ? await hashPassword(password) : ''
      let confirmedExpiry = ''

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        const authorizeRes = await fetch('/api/uploads/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileSize: file.size,
            fileType: file.type || 'application/octet-stream',
          }),
        })
        const authorization = await authorizeRes.json()
        if (!authorizeRes.ok) throw new Error(authorization.error || 'Upload failed')

        const parts = await uploadDirectly(file, authorization as UploadAuthorization, (uploaded, total) => {
          const fileFraction = total > 0 ? uploaded / total : 0
          setProgress(Math.round(((i + fileFraction) / files.length) * 100))
        })

        const completeRes = await fetch('/api/uploads/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectPath: authorization.objectPath,
            uploadId: authorization.uploadId,
            parts,
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size,
            shareToken: token,
            maxDownloads,
            passwordHash,
          }),
        })
        const completed = await completeRes.json()
        if (!completeRes.ok) throw new Error(completed.error || 'Share could not be created')
        confirmedExpiry = completed.expiresAt || confirmedExpiry
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }

      setProgress(100)
      const link = `${window.location.origin}/receive/${token}`
      setShareLink(link)
      setShareCode(token)
      setExpiresAt(confirmedExpiry)
      toast.success('File uploaded successfully!')
      window.setTimeout(() => {
        document.dispatchEvent(new CustomEvent('boltshare:natural-break', {
          detail: { event: 'upload_completed' },
        }))
      }, 700)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      toast.success('Link copied!')
    } catch {
      toast.error('Could not copy the link. Please copy it manually.')
    }
  }

  const shareLinkWithDevice = async () => {
    if (!navigator.share) {
      await copyLink()
      return
    }

    try {
      await navigator.share({ title: 'BoltShare file', url: shareLink })
    } catch {
      // Closing the native share sheet is not an app error.
    }
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
            { icon: Share2, label: 'Share Link',  action: shareLinkWithDevice },
            { icon: QrCode, label: 'QR Code',     action: () => setShowQr(value => !value) },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action} style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '0.875rem 0.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <Icon size={20} color="#F5C518" />
              <span style={{ fontSize: '0.7rem', color: '#B0B0B0' }}>{label}</span>
            </button>
          ))}
        </div>

        {showQr && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1rem', width: 'fit-content', margin: '0 auto 1.25rem' }}>
            <QRCodeSVG value={shareLink} size={196} level="M" />
          </div>
        )}

        {/* Link settings summary */}
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: '#fff', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>Link Settings</div>
          {[
            { icon: Clock,    label: 'Automatic deletion', value: `${TRANSFER_TTL_HOURS} hours` },
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

        <p style={{ color: '#8A8A8A', fontSize: '0.78rem', lineHeight: 1.5, margin: '-0.5rem 0 1.25rem', textAlign: 'center' }}>
          The files and their transfer records will be permanently deleted {expiresAt ? `on ${new Date(expiresAt).toLocaleString()}` : `after ${TRANSFER_TTL_HOURS} hours`}.
        </p>

        <button onClick={() => { setFiles([]); setShareLink(''); setShareCode(''); setExpiresAt('') }} style={{ width: '100%', background: '#F5C518', color: '#000', border: 'none', borderRadius: '14px', padding: '1rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
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
          { icon: Shield, label: 'Secure links', color: '#1D9E75' },
          { icon: Zap,    label: 'Direct storage', color: '#F5C518' },
          { icon: CheckCircle, label: 'Auto-expiring', color: '#60A5FA' },
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
        <p style={{ color: '#777', fontSize: '0.75rem' }}>Resumable multipart transfers · files up to approximately 5 TB</p>
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

        {/* Expiry */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          <Clock size={16} color="#8A8A8A" style={{ marginRight: '10px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.875rem', color: '#B0B0B0' }}>Automatic deletion</div>
            <div style={{ color: '#666', fontSize: '0.7rem', marginTop: '2px' }}>File and transfer record are permanently removed</div>
          </div>
          <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>{TRANSFER_TTL_HOURS} hours</span>
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
