# BoltShare 1.1.1 App Store resubmission

This checklist addresses submission `e8d04d61-405b-4c60-ba9e-c6f4335fdc77` and rejected build 11.

## Required release order

1. Apply `supabase/migrations/202608060001_guest_file_transfers.sql` to production.
2. Deploy the Next.js app and confirm these public URLs:
   - `https://boltshare.rcinc.app/upload`
   - `https://boltshare.rcinc.app/support`
3. Build the iOS wrapper in Codemagic. The workflow enforces build number 13 or higher.
4. Test the resulting TestFlight build on a physical iPad and iPhone.
5. Submit the new build only after the checks below pass.

The Capacitor wrapper loads the production website, so submitting the binary before the database migration and web deployment would leave the login issue unresolved.

## App Store Connect changes

- Support URL: `https://boltshare.rcinc.app/support`
- Update App Privacy to state that collected advertising data is **not used for tracking**.
- Keep the applicable AdMob data-collection disclosures for non-personalized advertising and diagnostics.
- No ATT recording is required because the iOS binary does not request ATT or access IDFA.

## Physical-device test script

Use a fresh install on a physical iPad and iPhone.

1. Launch BoltShare and verify no ATT prompt appears.
2. Confirm the signed-out welcome screen exposes **Send a file without an account**.
3. Select a normal file and complete a guest transfer without entering an email address.
4. Open the file picker again, tap **Take Photo or Video**, grant camera/microphone access, capture media, and return to BoltShare without a crash.
5. Repeat the camera denial path and confirm the app remains running.
6. Confirm ads do not block file-transfer actions.
7. Open Settings > **Ad privacy choices** where applicable.
8. Open `https://boltshare.rcinc.app/support` and verify the support email link works.

## Suggested App Review reply

Hello App Review,

Thank you for the detailed feedback. We addressed each issue in a new build:

- **Guideline 5.1.1(v):** File transfer no longer requires registration. From the first screen, tap **Send a file without an account**. Guests can select files, upload, create an expiring link/code, set a password, and set a download limit without providing an email address. Sign-in is optional and is used only for account-based history, analytics, and team features.
- **Guideline 2.1(a):** We added the required camera, microphone, and photo-library purpose strings for the iOS file picker. We tested **Take Photo or Video** on iPad, including allow and deny paths, without a crash.
- **Guideline 1.5:** The Support URL is now `https://boltshare.rcinc.app/support`, which includes direct contact information and support resources.
- **Guideline 2.1 / ATT:** BoltShare does not track users across apps or websites owned by other companies. The updated build removes the ATT request and usage-description key, does not access IDFA, disables Google Mobile Ads publisher first-party ID, and requests only non-personalized ads. We updated the App Privacy answers to state that advertising data is not used for tracking, so an ATT prompt is not applicable.

Thank you for reviewing the updated build.

## Final release gates

- `npm run lint`
- `npm run build` with production environment variables
- `cd mobile && pnpm verify`
- Codemagic `plutil -lint`, Swift package resolution, signing, and IPA build
- Fresh-install TestFlight test on an iPad running the latest available iPadOS
