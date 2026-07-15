import { NextRequest, NextResponse } from 'next/server'
import { APP_URL } from '@/lib/config'
import { createServerClient } from '@/lib/supabase/server'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeShareLink(value: unknown) {
  if (typeof value !== 'string' || !value) return ''
  try {
    const url = new URL(value, APP_URL)
    return url.origin === new URL(APP_URL).origin ? url.toString() : ''
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Sign in before sending email' }, { status: 401 })
    }

    const payload = await req.json()
    const recipient = String(payload.to || payload.recipientEmail || '').trim().toLowerCase()
    if (!EMAIL_PATTERN.test(recipient) || recipient.length > 254) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Email delivery is not configured' }, { status: 503 })
    }

    const link = safeShareLink(payload.shareUrl || payload.shareLink)
    const fileName = String(payload.fileName || '').slice(0, 180)
    const shareCode = String(payload.shareCode || '').replace(/[^A-Z2-9]/gi, '').slice(0, 10)
    const sender = String(payload.senderName || user.user_metadata?.full_name || user.email).slice(0, 100)
    const expiryHours = Number(payload.expiryHours)
    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null
    const expiryText = expiresAt && !Number.isNaN(expiresAt.getTime())
      ? expiresAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : Number.isFinite(expiryHours) && expiryHours > 0
        ? `in ${Math.min(expiryHours, 720)} hours`
        : 'according to the sender’s expiry setting'

    const subject = String(payload.subject || `${sender} shared ${fileName || 'a file'} with you on BoltShare`).slice(0, 180)
    const escapedSender = escapeHtml(sender)
    const escapedFile = escapeHtml(fileName)
    const escapedCode = escapeHtml(shareCode)
    const escapedLink = escapeHtml(link)
    const escapedAppUrl = escapeHtml(APP_URL)

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#0d0d0d;color:#fff;font-family:Arial,sans-serif}.wrap{max-width:600px;margin:auto;padding:32px 20px}.card{background:#1a1a1a;border:1px solid #333;border-radius:18px;padding:28px}.brand{color:#f5c518;font-size:24px;font-weight:700;margin-bottom:24px}.muted{color:#aaa;line-height:1.6}.file{background:#242424;border-radius:12px;padding:16px;margin:20px 0;word-break:break-word}.code{color:#f5c518;font:700 26px monospace;letter-spacing:.12em}.cta{display:block;background:#f5c518;color:#000!important;text-align:center;text-decoration:none;border-radius:12px;padding:15px;font-weight:700;margin:20px 0}.footer{color:#777;font-size:12px;text-align:center;margin-top:20px}</style></head>
<body><div class="wrap"><div class="card"><div class="brand">BoltShare</div>
<h2>You received ${fileName ? 'a file' : 'an invitation'}</h2>
<p class="muted"><strong>${escapedSender}</strong> sent this through BoltShare.</p>
${fileName ? `<div class="file"><strong>${escapedFile}</strong><br><span class="muted">Expires ${escapeHtml(expiryText)}</span></div>` : ''}
${shareCode ? `<div class="file">Access code<br><span class="code">${escapedCode}</span></div>` : ''}
${link ? `<a class="cta" href="${escapedLink}">${fileName ? 'Download file' : 'Open BoltShare'}</a>` : ''}
${shareCode ? `<p class="muted">Or enter the code at <a style="color:#f5c518" href="${escapedAppUrl}/receive-code">${escapedAppUrl}/receive-code</a>.</p>` : ''}
<p class="muted">Private links can be protected with a password and expire automatically.</p></div>
<div class="footer">BoltShare by RC Inc. · Automated message</div></div></body></html>`

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipient }] }],
        from: { email: 'boltshareupdate@rcinc.app', name: 'BoltShare' },
        reply_to: { email: user.email },
        subject,
        content: [{ type: 'text/html', value: html }],
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      console.error('SendGrid error:', response.status, await response.text())
      return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('send-email error:', error)
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 500 })
  }
}
