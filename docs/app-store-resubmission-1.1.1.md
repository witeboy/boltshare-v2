# BoltShare 1.1.1 App Store resubmission

This checklist addresses submission `e8d04d61-405b-4c60-ba9e-c6f4335fdc77` and rejected build 11.

## Required release order

1. Apply `supabase/migrations/202608060001_guest_file_transfers.sql` to production.
2. Deploy the Next.js app and confirm these public URLs:
   - `https://boltshare.rcinc.app/upload`
   - `https://boltshare.rcinc.app/support`
3. Build the iOS wrapper in Codemagic. The workflow enforces build number 12 or higher.
4. Test the resulting TestFlight build on a physical iPad and iPhone.
5. Submit the new build only after the checks below pass.

The Capacitor wrapper loads the production website, so submitting the binary before the database migration and web deployment would leave the login issue unresolved.

## App Store Connect changes

- Support URL: `https://boltshare.rcinc.app/support`
- Keep the App Privacy tracking declaration because the iOS binary includes Google AdMob and can request personalized ads only after ATT authorization.
- Confirm that the disclosed advertising data matches the current privacy policy.
- Attach a physical-device ATT recording in App Review Information > Notes.

## Physical-device test script

Use a fresh install or reset **Settings > Privacy & Security > Tracking** first.

1. Launch BoltShare and verify the ATT prompt appears before any ad is requested.
2. Choose **Ask App Not to Track** and confirm all file-transfer features remain usable.
3. From the signed-out welcome screen, tap **Send a file without an account**.
4. Select a normal file and complete a guest transfer without entering an email address.
5. Open the file picker again, tap **Take Photo or Video**, grant camera/microphone access, capture media, and return to BoltShare without a crash.
6. Repeat the camera denial path and confirm the app remains running.
7. Open Settings > **Ad privacy choices** where applicable.
8. Open `https://boltshare.rcinc.app/support` and verify the support email link works.

## Suggested App Review reply

Hello App Review,

Thank you for the detailed feedback. We addressed each issue in a new build:

- **Guideline 5.1.1(v):** File transfer no longer requires registration. From the first screen, tap **Send a file without an account**. Guests can select files, upload, create an expiring link/code, set a password, and set a download limit without providing an email address. Sign-in is optional and is used only for account-based history, analytics, and team features.
- **Guideline 2.1(a):** We added the required camera, microphone, and photo-library purpose strings for the iOS file picker. We tested **Take Photo or Video** on iPad, including allow and deny paths, without a crash.
- **Guideline 1.5:** The Support URL is now `https://boltshare.rcinc.app/support`, which includes direct contact information and support resources.
- **Guideline 2.1 / ATT:** On a fresh install, BoltShare now waits until the app is active, presents the App Tracking Transparency request, and resolves the choice before initializing ad measurement or requesting ads. Denying tracking does not restrict any feature. A physical-device recording is attached in App Review Information.

Thank you for reviewing the updated build.

## Final release gates

- `npm run lint`
- `npm run build` with production environment variables
- `cd mobile && pnpm verify`
- Codemagic `plutil -lint`, Swift package resolution, signing, and IPA build
- Fresh-install TestFlight test on an iPad running the latest available iPadOS

