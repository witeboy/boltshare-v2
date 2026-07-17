import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'

import { App } from '@capacitor/app'

const NATIVE_CALLBACK_URL = 'boltshare://auth/callback'
const AUTH_CALLBACK_MESSAGE = 'BOLTSHARE_AUTH_CALLBACK'
const AUTH_BRIDGE_READY_MESSAGE =
  'BOLTSHARE_AUTH_BRIDGE_READY'

interface AuthBridgeReadyMessage {
  type: typeof AUTH_BRIDGE_READY_MESSAGE
}

function isAuthBridgeReadyMessage(
  value: unknown,
): value is AuthBridgeReadyMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  return (
    (value as Record<string, unknown>).type ===
    AUTH_BRIDGE_READY_MESSAGE
  )
}

function isExpectedCallback(rawUrl: string) {
  try {
    const received = new URL(rawUrl)
    const expected = new URL(NATIVE_CALLBACK_URL)

    return (
      received.protocol === expected.protocol &&
      received.hostname === expected.hostname &&
      received.pathname === expected.pathname
    )
  } catch {
    return false
  }
}

function addNativeMarker(websiteUrl: string) {
  const url = new URL(websiteUrl)

  /*
   * The PWA reads this marker when deciding whether to use the web
   * callback or the native callback.
   */
  url.searchParams.set('native', 'capacitor')

  return url.toString()
}

export function useBoltShareAuthBridge(
  websiteUrl: string,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const bridgeReadyRef = useRef(false)
  const pendingCallbackRef = useRef<string | null>(null)

  const websiteOrigin = useMemo(
    () => new URL(websiteUrl).origin,
    [websiteUrl],
  )

  const iframeUrl = useMemo(
    () => addNativeMarker(websiteUrl),
    [websiteUrl],
  )

  const sendCallbackToWebApp = useCallback(
    (callbackUrl: string) => {
      if (!isExpectedCallback(callbackUrl)) {
        return
      }

      const iframeWindow =
        iframeRef.current?.contentWindow

      /*
       * On a cold launch, the URL can arrive before the BoltShare
       * website has finished loading. Save it until the iframe reports
       * that it is ready.
       */
      if (
        !iframeWindow ||
        !bridgeReadyRef.current
      ) {
        pendingCallbackRef.current = callbackUrl
        return
      }

      iframeWindow.postMessage(
        {
          type: AUTH_CALLBACK_MESSAGE,
          url: callbackUrl,
        },
        websiteOrigin,
      )

      pendingCallbackRef.current = null
    },
    [websiteOrigin],
  )

  /*
   * Listen for the ready signal from the BoltShare iframe.
   */
  useEffect(() => {
    const handleMessage = (
      event: MessageEvent<unknown>,
    ) => {
      if (
        event.source !==
        iframeRef.current?.contentWindow
      ) {
        return
      }

      if (event.origin !== websiteOrigin) {
        return
      }

      if (!isAuthBridgeReadyMessage(event.data)) {
        return
      }

      bridgeReadyRef.current = true

      if (pendingCallbackRef.current) {
        sendCallbackToWebApp(
          pendingCallbackRef.current,
        )
      }
    }

    window.addEventListener(
      'message',
      handleMessage,
    )

    return () => {
      window.removeEventListener(
        'message',
        handleMessage,
      )
    }
  }, [sendCallbackToWebApp, websiteOrigin])

  /*
   * appUrlOpen handles a callback while the app is already running.
   * getLaunchUrl handles a callback that cold-started the app.
   */
  useEffect(() => {
    let disposed = false

    let removeAppUrlListener:
      | (() => Promise<void>)
      | undefined

    const registerDeepLinks = async () => {
      const listener = await App.addListener(
        'appUrlOpen',
        ({ url }) => {
          sendCallbackToWebApp(url)
        },
      )

      removeAppUrlListener = () =>
        listener.remove()

      const launch = await App.getLaunchUrl()

      if (
        !disposed &&
        launch?.url
      ) {
        sendCallbackToWebApp(launch.url)
      }
    }

    void registerDeepLinks()

    return () => {
      disposed = true

      if (removeAppUrlListener) {
        void removeAppUrlListener()
      }
    }
  }, [sendCallbackToWebApp])

  return {
    iframeRef,
    iframeUrl,
  }
}
