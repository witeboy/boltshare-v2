'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, Users, Mail, Crown, Shield,
  UserMinus, Plus, Home, ArrowLeftRight,
  Settings, Loader2
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { LucideIcon } from 'lucide-react'

const roleColors: Record<string, string> = {
  owner:  '#F5C518',
  admin:  '#60A5FA',
  member: '#8A8A8A',
}

const roleIcons: Record<string, LucideIcon> = {
  owner:  Crown,
  admin:  Shield,
  member: Users,
}

interface Organization {
  id: string
  name: string
}

interface OrganizationMember {
  id: string
  user_email: string
  role: string
  status: string
  organization_id?: string
  organizations?: Organization
}

export default function TeamPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const [org, setOrg]           = useState<Organization | null>(null)
  const [members, setMembers]   = useState<OrganizationMember[]>([])
  const [myRole, setMyRole]     = useState<string>('member')
  const [loading, setLoading]   = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  async function loadTeam() {
    setLoading(true)
    try {
      const userEmail = user?.email?.toLowerCase()
      if (!userEmail) throw new Error('Your account is missing an email address')

      // Find my org membership
      const { data: myMembership } = await supabase
        .from('org_members')
        .select('*, organizations(*)')
        .eq('user_email', userEmail)
        .single()

      if (!myMembership) {
        // No org — create one automatically
        const { data: newOrg } = await supabase
          .from('organizations')
          .insert({
            name: userEmail.split('@')[0] + "'s Team",
            created_by_email: userEmail,
          })
          .select()
          .single()

        if (newOrg) {
          const { data: ownerMember, error: ownerError } = await supabase.from('org_members').insert({
            organization_id: newOrg.id,
            user_email: userEmail,
            role: 'owner',
            status: 'active',
          }).select().single()
          if (ownerError || !ownerMember) throw ownerError || new Error('Team owner could not be created')
          setOrg(newOrg)
          setMyRole('owner')
          setMembers([ownerMember])
        }
        setLoading(false)
        return
      }

      setOrg(myMembership.organizations)
      setMyRole(myMembership.role)

      // Load all members of this org
      const { data: allMembers } = await supabase
        .from('org_members')
        .select('*')
        .eq('organization_id', myMembership.organization_id)
        .order('created_at', { ascending: true })

      setMembers(allMembers || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) router.push('/')
  }, [isAuthenticated, isLoadingAuth, router])

  useEffect(() => {
    if (!user) return
    queueMicrotask(() => loadTeam())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleInvite() {
    if (!inviteEmail.trim() || !org) return
    if (!inviteEmail.includes('@')) { toast.error('Enter a valid email'); return }

    setInviting(true)
    try {
      // Check if already a member
      const { data: existing } = await supabase
        .from('org_members')
        .select('id')
        .eq('organization_id', org.id)
        .eq('user_email', inviteEmail.trim().toLowerCase())
        .single()

      if (existing) { toast.error('Already a member'); setInviting(false); return }

      const { error: inviteError } = await supabase.from('org_members').insert({
        organization_id: org.id,
        user_email:      inviteEmail.trim().toLowerCase(),
        role:            'member',
        status:          'invited',
      })
      if (inviteError) throw inviteError

      // Send invite email
      const emailResponse = await fetch('/api/send-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:      inviteEmail.trim(),
          subject: `You've been invited to ${org.name} on BoltShare`,
          fileName: null,
          shareLink: window.location.origin,
          shareCode: null,
          senderEmail: user!.email,
        }),
      })
      if (!emailResponse.ok) {
        await supabase
          .from('org_members')
          .delete()
          .eq('organization_id', org.id)
          .eq('user_email', inviteEmail.trim().toLowerCase())
        const body = await emailResponse.json().catch(() => null)
        throw new Error(body?.error || 'Invite email failed')
      }

      toast.success(`Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      loadTeam()
    } catch {
      toast.error('Failed to send invite')
    }
    setInviting(false)
  }

  async function handleRemove(memberId: string) {
    setRemoving(memberId)
    try {
      await supabase.from('org_members').delete().eq('id', memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
      toast.success('Member removed')
    } catch {
      toast.error('Failed to remove member')
    }
    setRemoving(null)
  }

  const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin'

  if (isLoadingAuth || !isAuthenticated) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #F5C518', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.25rem 0.75rem' }}>
        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.5rem' }}>Team</h2>
        <p style={{ color: '#8A8A8A', fontSize: '0.8rem', marginTop: '2px' }}>Manage your organization</p>
      </div>

      <div style={{ padding: '0 1.25rem' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        ) : (
          <>
            {/* Org card */}
            {org && (
              <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245,197,24,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={22} color="#F5C518" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{org.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8A8A8A', marginTop: '2px' }}>{members.length} member{members.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ background: 'rgba(245,197,24,0.12)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600, color: '#F5C518' }}>Free</div>
              </div>
            )}

            {/* Invite */}
            {isOwnerOrAdmin && (
              <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Mail size={15} color="#F5C518" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>Invite Team Member</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                    style={{ flex: 1, background: '#242424', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '10px', color: '#fff', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    style={{ background: '#F5C518', color: '#000', border: 'none', borderRadius: '10px', padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.875rem', cursor: inviting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                  >
                    {inviting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={15} /> Invite</>}
                  </button>
                </div>
              </div>
            )}

            {/* Members list */}
            <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: '#fff', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} color="#8A8A8A" /> Members
              </div>
              {members.map((m, i) => {
                const RoleIcon = roleIcons[m.role] || Users
                const isMe = m.user_email === user?.email
                const roleColor = roleColors[m.role] || '#8A8A8A'
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.875rem 1rem', borderBottom: i < members.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: roleColor }}>{m.user_email?.[0]?.toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.user_email} {isMe && <span style={{ fontSize: '0.7rem', color: '#555' }}>(you)</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        <RoleIcon size={11} color={roleColor} />
                        <span style={{ fontSize: '0.72rem', color: roleColor, fontWeight: 500 }}>{m.role}</span>
                        {m.status === 'invited' && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(245,197,24,0.12)', color: '#F5C518', padding: '1px 6px', borderRadius: '10px' }}>pending</span>
                        )}
                      </div>
                    </div>
                    {isOwnerOrAdmin && !isMe && m.role !== 'owner' && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        disabled={removing === m.id}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(226,75,74,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        {removing === m.id
                          ? <Loader2 size={14} color="#E24B4A" style={{ animation: 'spin 1s linear infinite' }} />
                          : <UserMinus size={14} color="#E24B4A" />
                        }
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0.6rem 0 0.8rem', zIndex: 50 }}>
        {[
          { icon: Home,           label: 'Home',      href: '/dashboard', active: false },
          { icon: ArrowLeftRight, label: 'Transfers', href: '/history',   active: false },
          { icon: Users,          label: 'Team',      href: '/team',      active: true  },
          { icon: Settings,       label: 'Settings',  href: '/settings',  active: false },
        ].map(({ icon: Icon, label, href, active }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', minWidth: '56px' }}>
            <Icon size={22} color={active ? '#F5C518' : '#555'} />
            <span style={{ fontSize: '0.65rem', color: active ? '#F5C518' : '#555', fontWeight: active ? 600 : 400 }}>{label}</span>
          </Link>
        ))}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
