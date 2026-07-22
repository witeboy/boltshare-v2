# BoltShare mobile wrapper

This package is a Capacitor remote-URL wrapper for `https://boltshare.rcinc.app/`.

The wrapper intentionally requests no camera, microphone, location, advertising, or notification permissions. Its native surface is limited to:

- Android/iOS deep links for BoltShare URLs;
- the system file picker for direct multipart uploads;
- Android Download Manager for received files;
- the native share sheet for transfer links;
- safe-area, status-bar, external-link, and Android back handling.

Run `pnpm install`, `pnpm sync:android`, `pnpm verify`, then `pnpm android:debug`.

Native identity:

- Android application ID: `app.rcinc.boltshare`
- iOS bundle ID: `app.rcinc.boltshare`
- Fallback URL scheme: `boltshare://`
- Version: `1.1.1` (`versionCode` / build number `2`)

Android debug builds are written to `android/app/build/outputs/apk/debug/app-debug.apk`. `pnpm android:bundle` creates the release AAB, but it remains unsigned until the production keystore or Play signing workflow is configured.

For local Android release signing, create the ignored file `android/signing.properties` with `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`. Use forward slashes in an absolute Windows keystore path. The release build automatically uses the file when all four values are present; credentials and keystores must never be committed.

For iOS, run `pnpm sync:ios` on the Mac that will perform the Xcode build. The command also normalizes Swift Package Manager paths so the generated project remains portable. Select the Apple development team in Xcode before device testing or archiving.

## Production link association

The web app exposes both association endpoints from environment-backed Route Handlers:

- `/.well-known/assetlinks.json` includes the release/upload certificate and reads `ANDROID_APP_SHA256_FINGERPRINTS` for additional certificates such as Google Play App Signing.
- `/.well-known/apple-app-site-association` reads `APPLE_TEAM_ID`.

Set the appropriate value in the production deployment only after the final store identity and signing authority are known. Do not publish a shared Android debug certificate fingerprint.
