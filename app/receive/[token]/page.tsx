'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Download, Lock, AlertTriangle, Zap, FileText, Image, Film, Archive, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

function fileIcon(type: string, size = 32) {
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

export default function ReceivePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const supabase = createClient()
  const [file, setFile]         = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [password, setPassword] = useState('')
  const [pwLocked, setPwLocked] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function loadFile() {
      const { data, error } = await supabase
        .from('shared_files')
        .select('*')
        .eq('share_token', token)
        .single()
      if (error || !data) { setError('This link is invalid or has been removed.'); setLoading(false); return }
      if (data.status !== 'active') { setError('This file has been deleted by the sender.'); setLoading(false); return }
      if (new Date(data.expires_at) < new Date()) { setError('This link has expired.'); setLoading(false); return }
      if (data.max_downloads && data.download_count >= data.max_downloads) { setError('This link has reached its maximum number of downloads.'); setLoading(false); return }
      if (data.password_hash) setPwLocked(true)
      setFile(data)
      setLoading(false)
    }
    loadFile()
  }, [token])

  async function handleDownload() {
    if (!file) return
    if (pwLocked) {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const { valid } = await res.json()
      if (!valid) { toast.error('Wrong password'); return }
      setPwLocked(false)
    }
    setDownloading(true)
    try {
      await fetch('/api/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id })
      })
      const a = document.createElement('a')
      a.href = file.file_url
      a.download = file.file_name
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success('Download started!')
    } catch {
      toast.error('Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'32px', height:'32px', borderRadius:'50%', border:'2px solid #F5C518', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
      <div style={{ textAlign:'center', maxWidth:'360px' }}>
        <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'rgba(226,75,74,0.12)', border:'0.5px solid rgba(226,75,74,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
          <AlertTriangle size={28} color="#E24B4A" />
        </div>
        <h2 style={{ color:'#fff', fontWeight:700, fontSize:'1.15rem', marginBottom:'8px' }}>Link unavailable</h2>
        <p style={{ color:'#8A8A8A', fontSize:'0.875rem', marginBottom:'1.5rem' }}>{error}</p>
        <a href="/" style={{ color:'#F5C518', fontSize:'0.875rem' }}>Go to BoltShare</a>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
      <div style={{ width:'100%', maxWidth:'400px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'2rem' }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'#F5C518', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Zap size={16} color="#000" fill="#000" />
          </div>
          <span style={{ fontSize:'1rem', fontWeight:700, color:'#fff' }}>BoltShare Receiver</span>
        </div>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ width:'100px', height:'100px', borderRadius:'50%', background:'rgba(245,197,24,0.08)', border:'0.5px solid rgba(245,197,24,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', filter:'drop-shadow(0 0 24px rgba(245,197,24,0.3))' }}>
            <Shield size={52} color="#F5C518" fill="rgba(245,197,24,0.15)" />
          </div>
          <h2 style={{ color:'#fff', fontWeight:700, fontSize:'1.25rem', marginTop:'1rem' }}>You received a file</h2>
          <p style={{ color:'#8A8A8A', fontSize:'0.875rem', marginTop:'4px' }}>Shared securely via BoltShare</p>
        </div>
        <div style={{ background:'#1A1A1A', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:'18px', padding:'1.25rem', marginBottom:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'#242424', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {fileIcon(file.file_type)}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'0.9rem', fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.file_name}</div>
              <div style={{ fontSize:'0.75rem', color:'#8A8A8A', marginTop:'3px' }}>{formatBytes(file.file_size)}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'12px', paddingTop:'12px', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#1D9E75', flexShrink:0 }} />
            <span style={{ fontSize:'0.72rem', color:'#8A8A8A' }}>
              Expires {new Date(file.expires_at).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
            </span>
          </div>
        </div>
        {pwLocked && (
          <div style={{ background:'#1A1A1A', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:'14px', padding:'1rem', marginBottom:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
              <Lock size={16} color="#F5C518" />
              <span style={{ fontSize:'0.875rem', color:'#fff', fontWeight:500 }}>Password required</span>
            </div>
            <input type="password" placeholder="Enter password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDownload()}
              style={{ width:'100%', background:'#242424', border:'0.5px solid rgba(255,255,255,0.14)', borderRadius:'10px', color:'#fff', padding:'0.8rem 1rem', fontSize:'0.9rem', outline:'none' }} />
          </div>
        )}
        <button onClick={handleDownload} disabled={downloading}
          style={{ width:'100%', background:downloading ? '#B8960F' : '#F5C518', color:'#000', border:'none', borderRadius:'14px', padding:'1rem', fontWeight:700, fontSize:'1rem', cursor:downloading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'1rem' }}>
          {downloading
            ? <><Loader2 size={20} style={{ animation:'spin 1s linear infinite' }} /> Downloading...</>
            : <><Download size={20} /> Download File</>}
        </button>
        <div style={{ display:'flex', justifyContent:'center', gap:'16px' }}>
          {['End-to-end Encrypted','Bunny CDN','Virus Scanned'].map(label =>
            <span key={label} style={{ fontSize:'0.68rem', color:'#555' }}>{label}</span>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}