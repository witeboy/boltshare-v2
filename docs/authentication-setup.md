# BoltShare authentication setup

BoltShare uses one HTTPS callback for the website and the Capacitor app:

```text
https://boltshare.rcinc.app/auth/mobile/callback
```

The PWA no longer contains Capacitor or iframe bridge code. The native wrapper loads the deployed website as its top-level `server.url` WebView and must handle the HTTPS callback as an Android App Link / iOS Universal Link.

## 1. Vercel environment variables

```env
NEXT_PUBLIC_APP_URL=https://boltshare.rcinc.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Do not add `NEXT_PUBLIC_NATIVE_AUTH_CALLBACK_URL`. It belonged to the removed custom-scheme iframe flow.

## 2. Supabase URL configuration

In **Authentication → URL Configuration**:

```text
Site URL
https://boltshare.rcinc.app
```

Add both redirect URLs during the transition:

```text
https://boltshare.rcinc.app/auth/mobile/callback
https://boltshare.rcinc.app/auth/callback
```

The second path is retained only so older emails continue working.

## 3. Supabase Magic Link email template

In **Authentication → Email Templates → Magic Link**, make the link point to the HTTPS callback and include the six-digit fallback code:

```html
<h2>Sign in to BoltShare</h2>

<p>Tap the button below to continue:</p>

<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">
    Sign in to BoltShare
  </a>
</p>

<p>Or enter this six-digit code inside the BoltShare app:</p>

<p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">
  {{ .Token }}
</p>

<p>This link and code expire shortly and can only be used once.</p>
```

Disable click tracking or link rewriting in any external SMTP provider. Rewritten authentication links can break verification.

## 4. Why the callback has a confirmation button

The callback page does not consume the one-time token during the initial GET request. It waits for the user to press **Confirm and Sign In**. This reduces failures caused by email-security scanners that automatically visit links before the user taps them.

## 5. Capacitor wrapper requirement

This code belongs in the separate Capacitor wrapper, not in this PWA repository. Install `@capacitor/app` in the wrapper and handle both a running app and a cold launch:

```ts
import { App } from '@capacitor/app'

const AUTH_ORIGIN = 'https://boltshare.rcinc.app'
const AUTH_PATH = '/auth/mobile/callback'

function openBoltShareAuthUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl)

    if (url.origin !== AUTH_ORIGIN || url.pathname !== AUTH_PATH) {
      return
    }

    // The wrapper uses server.url, so this loads the callback in the same
    // top-level WebView that stores the BoltShare Supabase session.
    window.location.assign(url.toString())
  } catch (error) {
    console.error('Invalid BoltShare auth URL:', error)
  }
}

export async function initializeBoltShareAuthLinks() {
  await App.addListener('appUrlOpen', ({ url }) => {
    openBoltShareAuthUrl(url)
  })

  const launch = await App.getLaunchUrl()

  if (launch?.url) {
    openBoltShareAuthUrl(launch.url)
  }
}
```

The native Android and iOS projects must associate `boltshare.rcinc.app` with the app and route `/auth/mobile/callback` into it.

## 6. Test matrix

Test all four cases with a newly generated email each time:

1. Website already open, then click the sign-in link.
2. Native app already open, then click the sign-in link.
3. Native app completely closed, then click the sign-in link.
4. Enter the six-digit code inside the app without clicking the link.

A one-time link or code cannot be reused after a successful verification.
