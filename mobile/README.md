# BoltShare mobile wrapper

This package is a Capacitor remote-URL wrapper for `https://boltshare.rcinc.app/`.

The wrapper intentionally requests no camera, microphone, location, or notification permissions. Its native surface includes:

- Android/iOS deep links for BoltShare URLs;
- the system file picker for direct multipart uploads;
- Android Download Manager for received files;
- the native share sheet for transfer links;
- safe-area, status-bar, external-link, and Android back handling.
- Android AdMob with UMP consent, a centered top banner, policy-labelled native placements on content pages, and frequency-controlled interstitials at natural breaks.

Run `pnpm install`, `pnpm sync:android`, `pnpm verify`, then `pnpm android:debug`.

Native identity:

- Android application ID: `app.rcinc.boltshare`
- iOS bundle ID: `app.rcinc.boltshare`
- Fallback URL scheme: `boltshare://`
- Version: `1.1.1` (`versionCode` / build number `2`)

Android debug builds are written to `android/app/build/outputs/apk/debug/app-debug.apk`. `pnpm android:bundle` creates the release AAB, but it remains unsigned until the production keystore or Play signing workflow is configured.

For local Android release signing, create the ignored file `android/signing.properties` with `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`. Use forward slashes in an absolute Windows keystore path. The release build automatically uses the file when all four values are present; credentials and keystores must never be committed.

For iOS, run `pnpm sync:ios` on the Mac that will perform the Xcode build. The command also normalizes Swift Package Manager paths so the generated project remains portable. Select the Apple development team in Xcode before device testing or archiving.

## Android advertising

Release builds use the BoltShare production App ID and ad units from `android/app/src/main/java/app/rcinc/boltshare/AdMobConfig.java`; debug builds automatically use Google's official test units and five-second test cooldowns. Never click production ads during testing.

- The 320x50 banner is centered in a dedicated top strip and remains visible after it loads.
- Native Advanced is a compact, clearly labelled reserved slot on Dashboard, History, and Team. It begins after 120 seconds and is limited to one new placement every 10 minutes.
- Interstitials never show at launch. Explicit upload/download completion is eligible after 120 seconds; the wrapper fallback requires three meaningful top-level route transitions. Every impression is separated by at least 180 seconds and the hard process-session ceiling is 24.
- Ads continue the app flow immediately when an ad is unavailable.
- UMP refreshes consent information at every launch and exposes Ad privacy choices in Settings when Google requires the entry point.

Before production rollout, create and publish the applicable GDPR/US-state messages under AdMob **Privacy & messaging**. The website exposes `/app-ads.txt` for publisher verification. Android ads are configured; iOS still requires separate iOS App ID/ad units before native iOS ad code is added.

## Production link association

The web app exposes both association endpoints from environment-backed Route Handlers:

- `/.well-known/assetlinks.json` includes the release/upload certificate and reads `ANDROID_APP_SHA256_FINGERPRINTS` for additional certificates such as Google Play App Signing.
- `/.well-known/apple-app-site-association` reads `APPLE_TEAM_ID`.

Set the appropriate value in the production deployment only after the final store identity and signing authority are known. Do not publish a shared Android debug certificate fingerprint.
