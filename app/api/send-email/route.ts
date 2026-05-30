import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const {
      to,
      recipientEmail,
      subject,
      fileName,
      shareUrl,
      shareLink,
      shareCode,
      expiryHours,
      expiresAt,
      senderEmail,
      senderName,
    } = await req.json()

    const recipientTo = to || recipientEmail
    if (!recipientTo || !recipientTo.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const apiKey  = process.env.SENDGRID_API_KEY
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL || 'https://boltshare.rcinc.app'
    const link    = shareUrl || shareLink || ''
    const sender  = senderName || senderEmail || 'Someone'
    const expDate = expiresAt
      ? new Date(expiresAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : expiryHours
        ? `in ${expiryHours} hours`
        : '24 hours'

    if (!apiKey) {
      return NextResponse.json({ error: 'SendGrid not configured' }, { status: 500 })
    }

    const emailSubject = subject || `📎 ${sender} shared "${fileName || 'a file'}" with you on BoltShare`

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; background:#0D0D0D; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
    .wrap { max-width:600px; margin:0 auto; padding:32px 20px; }
    .logo-row { text-align:center; margin-bottom:32px; }
    .logo-icon { display:inline-flex; align-items:center; justify-content:center; width:48px; height:48px; background:#F5C518; border-radius:14px; margin-bottom:10px; }
    .logo-text { color:#fff; font-size:22px; font-weight:700; letter-spacing:-0.02em; }
    .logo-sub  { color:#8A8A8A; font-size:13px; margin-top:2px; }
    .card { background:#1A1A1A; border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:28px; margin-bottom:20px; }
    .greeting { color:#fff; font-size:18px; font-weight:600; margin-bottom:8px; }
    .greeting-sub { color:#8A8A8A; font-size:14px; line-height:1.6; margin-bottom:24px; }
    .file-card { background:#242424; border-radius:14px; padding:16px; margin-bottom:20px; display:flex; align-items:center; gap:14px; }
    .file-icon { width:44px; height:44px; background:#2E2E2E; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
    .file-name { color:#fff; font-size:15px; font-weight:600; margin-bottom:3px; word-break:break-all; }
    .file-meta { color:#8A8A8A; font-size:12px; }
    .code-block { background:#242424; border-radius:12px; padding:16px; text-align:center; margin-bottom:20px; }
    .code-label { color:#8A8A8A; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px; }
    .code-value { color:#F5C518; font-size:28px; font-weight:700; letter-spacing:0.15em; font-family:'Courier New',monospace; }
    .cta { display:block; background:#F5C518; color:#000 !important; text-decoration:none; border-radius:12px; padding:16px; text-align:center; font-weight:700; font-size:16px; margin-bottom:20px; }
    .divider { border:none; border-top:1px solid rgba(255,255,255,0.06); margin:20px 0; }
    .how-title { color:#fff; font-size:13px; font-weight:600; margin-bottom:12px; }
    .how-item { display:flex; gap:10px; margin-bottom:10px; align-items:flex-start; }
    .how-num { width:22px; height:22px; background:rgba(245,197,24,0.12); border-radius:50%; color:#F5C518; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
    .how-text { color:#B0B0B0; font-size:13px; line-height:1.5; }
    .how-text a { color:#F5C518; text-decoration:none; }
    .trust-row { display:flex; justify-content:center; gap:20px; margin-top:24px; }
    .trust-item { color:#555; font-size:11px; }
    .footer { text-align:center; color:#555; font-size:11px; margin-top:24px; line-height:1.8; }
  </style>
</head>
<body>
  <div class="wrap">

    <!-- Logo -->
    <div class="logo-row">
      <div class="logo-icon">⚡</div>
      <div class="logo-text">BoltShare</div>
      <div class="logo-sub">Secure File Transfer</div>
    </div>

    <!-- Main card -->
    <div class="card">
      <div class="greeting">You received a file</div>
      <div class="greeting-sub"><strong style="color:#fff">${sender}</strong> has shared a file with you via BoltShare — encrypted and delivered securely.</div>

      <!-- File card -->
      ${fileName ? `
      <div class="file-card">
        <div class="file-icon">📄</div>
        <div>
          <div class="file-name">${fileName}</div>
          <div class="file-meta">Expires ${expDate}</div>
        </div>
      </div>
      ` : ''}

      <!-- Access code -->
      ${shareCode ? `
      <div class="code-block">
        <div class="code-label">Your access code</div>
        <div class="code-value">${shareCode}</div>
      </div>
      ` : ''}

      <!-- CTA -->
      ${link ? `<a href="${link}" class="cta">⬇ Download File Now</a>` : ''}

      <hr class="divider">

      <!-- How it works -->
      <div class="how-title">How to access your file</div>
      ${link ? `
      <div class="how-item">
        <div class="how-num">1</div>
        <div class="how-text"><strong style="color:#fff">Direct link:</strong> Click the button above to download immediately</div>
      </div>
      ` : ''}
      ${shareCode ? `
      <div class="how-item">
        <div class="how-num">2</div>
        <div class="how-text"><strong style="color:#fff">Enter code:</strong> Go to <a href="${appUrl}/receive-code">${appUrl}/receive-code</a> and enter <strong style="color:#F5C518">${shareCode}</strong></div>
      </div>
      ` : ''}
      <div class="how-item">
        <div class="how-num">3</div>
        <div class="how-text">Files are end-to-end encrypted and auto-delete after expiry</div>
      </div>
    </div>

    <!-- Trust row -->
    <div class="trust-row">
      <span class="trust-item">🔒 End-to-end Encrypted</span>
      <span class="trust-item">⚡ Bunny CDN</span>
      <span class="trust-item">🛡 Virus Scanned</span>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>BoltShare — Secure File Transfer by RC Inc.</p>
      <p>This is an automated message. Do not reply to this email.</p>
      ${link ? `<p style="margin-top:8px;word-break:break-all">Link: ${link}</p>` : ''}
    </div>

  </div>
</body>
</html>`

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipientTo }] }],
        from: { email: 'boltshareupdate@rcinc.app', name: 'BoltShare' },
        reply_to: { email: 'boltshareupdate@rcinc.app' },
        subject: emailSubject,
        content: [{ type: 'text/html', value: html }],
        // Disable tracking — prevents SendGrid wrapping URLs through its domain
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking:  { enable: false },
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('SendGrid error:', response.status, errText)
      return NextResponse.json({ error: `SendGrid error: ${response.status}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('send-email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}