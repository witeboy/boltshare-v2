'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  Zap, Bell, Menu, Upload, Download, FileText,
  Image, Film, Archive, ArrowRight, Home,
  ArrowLeftRight, Users, Settings, ChevronRight
} from 'lucide-react'
import Link from 'next/link'

function fileIcon(type: string) {
  if (type?.includes('image')) return <Image size={18} color="#F5C518" />
  if (type?.includes('video')) return <Film size={18} color="#8B5CF6" />
  if (type?.includes('pdf'))   return <FileText size={18} color="#E24B4A" />
  if (type?.includes('zip') || type?.includes('archive')) return <Archive size={18} color="#F5A623" />
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

export default function DashboardPage() {
  const { user, isAuthenticated, isLoadingAuth, logout } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [files, setFiles]       = useState<any[]>([])
  const [stats, setStats]       = useState({ total: 0, active: 0, downloads: 0 })
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoadingAuth])

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data } = await supabase
        .from('shared_files')
        .select('*')
        .eq('sender_email', user!.email)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) {
        setFiles(data.slice(0, 5))
        const active = data.filter(f => f.status === 'active' && new Date(f.expires_at) > new Date()).length
        const downloads = data.reduce((a, f) => a + (f.download_count || 0), 0)
        setStats({ total: data.length, active, downloads })
      }
      setLoading(false)
    }
    load()
  }, [user])

  if (isLoadingAuth || !isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #F5C518', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there'

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem 0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#000" fill="#000" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>BoltShare</div>
            <div style={{ fontSize: '10px', color: '#8A8A8A' }}>RC Inc.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8A8A' }}><Bell size={20} /></button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8A8A' }}><Menu size={20} /></button>
        </div>
      </div>

      <div style={{ padding: '0 1.25rem' }}>

        {/* Greeting */}
        <div style={{ margin: '1.25rem 0 1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Welcome,<br />{firstName}
          </h1>
          <p style={{ color: '#8A8A8A', fontSize: '0.875rem', marginTop: '6px' }}>
            Let's transfer files securely ⚡
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
          {[
            { num: stats.total,     label: 'Total Files' },
            { num: stats.active,    label: 'Active Links' },
            { num: stats.downloads, label: 'Downloads' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0.875rem' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: '0.7rem', color: '#8A8A8A', marginTop: '4px', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Send CTA */}
        <Link href="/upload" style={{ textDecoration: 'none', display: 'block', marginBottom: '10px' }}>
          <div style={{ background: '#F5C518', borderRadius: '18px', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Upload size={22} color="#000" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#000' }}>Send</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)', marginTop: '2px' }}>Send files securely</div>
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRight size={16} color="#000" />
            </div>
          </div>
        </Link>

        {/* Receive CTA */}
        <Link href="/receive-code" style={{ textDecoration: 'none', display: 'block', marginBottom: '1.5rem' }}>
          <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Download size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Receive</div>
              <div style={{ fontSize: '0.8rem', color: '#8A8A8A', marginTop: '2px' }}>Receive files instantly</div>
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRight size={16} color="#8A8A8A" />
            </div>
          </div>
        </Link>

        {/* Recent Activity */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>Recent Activity</h4>
          <Link href="/history" style={{ color: '#F5C518', fontSize: '0.8rem', textDecoration: 'none' }}>View all</Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#555' }}>Loading...</div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: '#555', fontSize: '0.875rem' }}>No files yet. Send your first file!</p>
          </div>
        ) : (
          <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            {files.map((f, i) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.875rem 1rem', borderBottom: i < files.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {fileIcon(f.file_type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8A8A8A', marginTop: '2px' }}>
                    {f.file_size ? (f.file_size / (1024 * 1024)).toFixed(1) + ' MB' : '—'} · {f.share_method === 'sent' ? 'Sent' : 'Link'}
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#555', flexShrink: 0 }}>{timeAgo(f.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0.6rem 0 0.8rem', zIndex: 50 }}>
        {[
          { icon: Home,            label: 'Home',      href: '/dashboard',    active: true  },
          { icon: ArrowLeftRight,  label: 'Transfers', href: '/history',      active: false },
          { icon: Users,           label: 'Team',      href: '/team',         active: false },
          { icon: Settings,        label: 'Settings',  href: '/settings',     active: false },
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