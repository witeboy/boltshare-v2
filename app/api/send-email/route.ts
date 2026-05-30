import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // Verify auth
    const authHeader = req.headers.get('authorization')
    const supabase = createAdminClient()

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data } = await supabase.auth.getUser(token)
      if (!data.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { to, subject, fileName, shareLink, shareCode, expiryHours, senderEmail } = await req.json()

    if (!to || !subject) {
      return NextResponse.json({ error: 'to and subject are required' }, { status: 400 })
    }

    const apiKey  = process.env.SENDGRID_API_KEY
    const from    = process.env.EMAIL_FROM || 'noreply@boltshare.app'
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL || 'https://boltshare.rcinc.app'

    if (!apiKey) {
      return NextResponse.json({ error: 'SendGrid not configured' }, { status: 500 })
    }

    // Build email HTML
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;gap:8px">
        <div style="width:32px;height:32px;border-radius:8px;background:#F5C518;display:inline-flex;align-items:center;justify-content:center">
          <span style="font-size:18px">⚡</span>
        </div>
        <span style="font-size:18px;font-weight:700;color:#fff">BoltShare</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#1A1A1A;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px">
      <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px">You received a file</h2>
      <p style="color:#8A8A8A;font-size:14px;margin:0 0 24px">
        ${senderEmail ? senderEmail + ' sent you a file via BoltShare' : 'Someone sent you a file via BoltShare'}
      </p>

      ${fileName ? `
      <div style="background:#242424;border-radius:12px;padding:16px;margin-bottom:24px;display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:10px;background:#2E2E2E;display:flex;align-items:center;justify-content:center;font-size:20px">📄</div>
        <div>
          <div style="color:#fff;font-weight:500;font-size:14px">${fileName}</div>
          ${expiryHours ? `<div style="color:#8A8A8A;font-size:12px;margin-top:2px">Expires in ${expiryHours} hours</div>` : ''}
        </div>
      </div>` : ''}

      ${shareCode ? `
      <div style="background:#242424;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center">
        <div style="color:#8A8A8A;font-size:12px;margin-bottom:6px">Your access code</div>
        <div style="color:#F5C518;font-size:28px;font-weight:700;letter-spacing:0.15em;font-family:monospace">${shareCode}</div>
      </div>` : ''}

      <!-- CTA Button -->
      <a href="${shareLink}"
        style="display:block;background:#F5C518;color:#000;text-decoration:none;border-radius:12px;padding:14px;text-align:center;font-weight:700;font-size:16px;margin-bottom:16px">
        Download File
      </a>

      <p style="color:#555;font-size:12px;text-align:center;margin:0">
        Or copy this link: <a href="${shareLink}" style="color:#F5C518">${shareLink}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px">
      <p style="color:#555;font-size:12px;margin:0">
        End-to-end encrypted · Bunny CDN · Virus scanned<br>
        <a href="${appUrl}" style="color:#8A8A8A">${appUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`

    // Send via SendGrid
    const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from:    { email: from, name: 'BoltShare' },
        subject: subject,
        content: [{ type: 'text/html', value: html }],
      }),
    })

    if (!sgResponse.ok) {
      const err = await sgResponse.text()
      console.error('SendGrid error:', err)
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('send-email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}