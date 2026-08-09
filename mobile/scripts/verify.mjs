import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const failures = [];
const checks = [];

function expect(label, condition) {
  checks.push({ label, ok: Boolean(condition) });
  if (!condition) failures.push(label);
}

const [
  appConfigText,
  capConfigText,
  manifest,
  gradle,
  strings,
  activity,
  nativePlugin,
  adsManager,
  adsConfig,
  nativeAdLayout,
  webClient,
  bridgeScript,
  publicBridgeScript,
  privacyPolicy,
  appAdsText,
  iosInfo,
  iosEntitlements,
  iosProject,
  iosPackage,
  iosNormalizer,
  iosAdmobPlugin,
  aasaRoute,
  codemagic,
  artworkGenerator,
  homePage,
  uploadPage,
  transferOwner,
  authorizeRoute,
  partUrlsRoute,
  completeRoute,
  guestMigration,
  supportPage,
] = await Promise.all([
  read('app.config.json'),
  read('capacitor.config.json'),
  read('android/app/src/main/AndroidManifest.xml'),
  read('android/app/build.gradle'),
  read('android/app/src/main/res/values/strings.xml'),
  read('android/app/src/main/java/com/boltshare/rcinc/MainActivity.java'),
  read('android/app/src/main/java/com/boltshare/rcinc/BoltShareNativePlugin.java'),
  read('android/app/src/main/java/com/boltshare/rcinc/BoltShareAdsManager.java'),
  read('android/app/src/main/java/com/boltshare/rcinc/AdMobConfig.java'),
  read('android/app/src/main/res/layout/view_native_ad.xml'),
  read('android/app/src/main/java/com/boltshare/rcinc/BoltShareWebViewClient.java'),
  read('www/remote-bridge.js'),
  read('../public/mobile-bridge.js'),
  read('../app/privacy/page.tsx'),
  read('../app/app-ads.txt/route.ts'),
  read('ios/App/App/Info.plist'),
  read('ios/App/App/App.entitlements'),
  read('ios/App/App.xcodeproj/project.pbxproj'),
  read('ios/App/CapApp-SPM/Package.swift'),
  read('scripts/normalize-ios-package.mjs'),
  read('node_modules/@capacitor-community/admob/ios/Sources/AdMobPlugin/AdMobPlugin.swift'),
  read('../app/.well-known/apple-app-site-association/route.ts'),
  read('../codemagic.yaml'),
  read('scripts/generate-ios-artwork.swift'),
  read('../app/page.tsx'),
  read('../app/upload/page.tsx'),
  read('../lib/transfer-owner.ts'),
  read('../app/api/uploads/authorize/route.ts'),
  read('../app/api/uploads/part-urls/route.ts'),
  read('../app/api/uploads/complete/route.ts'),
  read('../supabase/migrations/202608060001_guest_file_transfers.sql'),
  read('../app/support/page.tsx'),
]);

const appConfig = JSON.parse(appConfigText);
const capConfig = JSON.parse(capConfigText);
const expectedId = appConfig.identity.androidPackage;
const expectedIosId = appConfig.identity.iosBundleId;
const expectedAppleTeamId = appConfig.identity.appleTeamId;
const expectedVersion = appConfig.app.versionName;
const expectedCode = appConfig.app.versionCode;
const expectedHost = new URL(appConfig.web.url).host;

expect('Capacitor app ID matches app config', capConfig.appId === expectedId);
expect('Capacitor URL is HTTPS', new URL(capConfig.server.url).protocol === 'https:');
expect('Capacitor navigation is restricted to the app host', capConfig.server.allowNavigation.length === 1 && capConfig.server.allowNavigation[0] === expectedHost);
expect('Android application ID matches', gradle.includes(`applicationId "${expectedId}"`));
expect('Android namespace matches', gradle.includes(`namespace = "${expectedId}"`));
expect('Android package-name resource matches', strings.includes(`<string name="package_name">${expectedId}</string>`));
expect('Android version name matches', gradle.includes(`versionName "${expectedVersion}"`));
expect('Android version code matches', gradle.includes(`versionCode ${expectedCode}`));
expect('Java 21 is configured', gradle.includes('JavaVersion.VERSION_21'));
expect('Custom URL scheme matches', strings.includes(`<string name="custom_url_scheme">${appConfig.identity.urlScheme}</string>`));
expect('Verified HTTPS App Link exists', manifest.includes('android:autoVerify="true"') && manifest.includes(`android:host="${expectedHost}"`));
expect('Custom-scheme fallback exists', manifest.includes(`android:scheme="${appConfig.identity.urlScheme}"`));
expect('Cleartext traffic is disabled', manifest.includes('android:usesCleartextTraffic="false"'));
expect('Native wrapper plugin is registered before activity creation', activity.indexOf('registerPlugin(BoltShareNativePlugin.class)') < activity.indexOf('super.onCreate'));
expect('Native downloads use Android DownloadManager', nativePlugin.includes('DownloadManager.Request'));
expect('Downloads require HTTPS', nativePlugin.includes('Only HTTPS downloads are allowed'));
expect('Remote bridge is injected only on the app host', webClient.includes('APP_HOST = "boltshare.rcinc.app"') && webClient.includes('evaluateJavascript'));
expect('Native share fallback is installed', bridgeScript.includes('navigator.share'));
expect('Deep links are handled on cold and warm starts', bridgeScript.includes('getLaunchUrl') && bridgeScript.includes('appUrlOpen'));
expect('Custom-scheme links are translated to HTTPS', bridgeScript.includes("parsed.protocol === 'boltshare:'"));
expect('Android back is handled', bridgeScript.includes('backButton') && bridgeScript.includes('minimizeApp'));
expect('Web-deployed and native-injected bridges match', bridgeScript.trim() === publicBridgeScript.trim());
expect('Injected bridge upgrades an older deployed bridge safely', bridgeScript.includes('BRIDGE_VERSION = 7') && bridgeScript.includes('legacyBridgeAlreadyInstalled') && bridgeScript.includes('installAdSignals();'));
expect('AdMob feature is enabled in app config', appConfig.features.ads === true);
expect('Android AdMob application ID matches app config', manifest.includes(`android:value="${appConfig.android.adMob.appId}"`));
expect('Google Mobile Ads and UMP dependencies exist on Android', gradle.includes('play-services-ads:25.4.0') && gradle.includes('user-messaging-platform:4.0.0'));
expect('Android production banner unit matches app config', adsConfig.includes(appConfig.android.adMob.bannerUnitId));
expect('Android production interstitial unit matches app config', adsConfig.includes(appConfig.android.adMob.interstitialUnitId));
expect('Android production native unit matches app config', adsConfig.includes(appConfig.android.adMob.nativeUnitId));
expect('Android debug builds use Google test ad units', adsConfig.includes('ca-app-pub-3940256099942544/9214589741') && adsConfig.includes('ca-app-pub-3940256099942544/1033173712') && adsConfig.includes('ca-app-pub-3940256099942544/2247696110'));
expect('Android banner is centered in a reserved native slot', adsManager.includes('Gravity.TOP | Gravity.CENTER_HORIZONTAL') && adsManager.includes('AdSize.BANNER'));
expect('Android UMP gates ad requests on current consent', adsManager.includes('requestConsentInfoUpdate') && adsManager.includes('loadAndShowConsentFormIfRequired') && adsManager.includes('canRequestAds()'));
expect('Interstitial natural-break bridge exists', nativePlugin.includes('naturalBreak(PluginCall call)') && bridgeScript.includes('boltshare:natural-break'));
expect('Android interstitial policy controls match app config', adsConfig.includes(`INTERSTITIAL_LAUNCH_COOLDOWN_MS = ${appConfig.android.adMob.interstitialLaunchCooldownSeconds}_000L`) && adsConfig.includes(`INTERSTITIAL_MIN_INTERVAL_MS = ${appConfig.android.adMob.interstitialMinimumIntervalSeconds}_000L`) && adsConfig.includes(`INTERSTITIAL_ROUTE_THRESHOLD = ${appConfig.android.adMob.interstitialRouteThreshold}`) && adsConfig.includes(`INTERSTITIAL_SESSION_CAP = ${appConfig.android.adMob.interstitialSessionCap}`));
expect('Native ad is clearly labelled and has AdChoices', strings.includes('<string name="native_ad_label">Ad</string>') && nativeAdLayout.includes('android:text="@string/native_ad_label"') && nativeAdLayout.includes('AdChoicesView'));
expect('Ad privacy choices bridge exists', nativePlugin.includes('showAdPrivacyOptions') && bridgeScript.includes('data-boltshare-ad-privacy'));
expect('Privacy policy explains non-tracking mobile ads', privacyPolicy.includes('Google AdMob') && privacyPolicy.includes('does not request App Tracking Transparency permission') && privacyPolicy.includes('does not use advertising data to track'));
expect('app-ads.txt declares the AdMob publisher', appAdsText.includes('pub-9689004813456541') && appAdsText.includes('f08c47fec0942fa0'));

expect('iOS bundle ID matches registered App ID', iosProject.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${expectedIosId};`));
expect('Apple Team ID is applied to iOS signing', iosProject.includes(`DEVELOPMENT_TEAM = ${expectedAppleTeamId};`));
expect('iOS version name matches', iosProject.includes(`MARKETING_VERSION = ${expectedVersion};`));
expect('iOS build number is configured', new RegExp(`CURRENT_PROJECT_VERSION = (?:${expectedCode}|[3-9][0-9]*);`).test(iosProject));
expect('iOS deployment target matches', iosProject.includes(`IPHONEOS_DEPLOYMENT_TARGET = ${appConfig.ios.deploymentTarget};`));
expect('iOS custom URL scheme exists', iosInfo.includes(`<string>${appConfig.identity.urlScheme}</string>`));
expect('iOS AdMob App ID is in Info.plist', iosInfo.includes(`<string>${appConfig.ios.adMob.appId}</string>`));
expect('iOS ATT purpose string is absent', !iosInfo.includes('<key>NSUserTrackingUsageDescription</key>'));
expect('iOS declares only exempt encryption', iosInfo.includes('<key>ITSAppUsesNonExemptEncryption</key>') && iosInfo.includes('<false/>'));
expect('iOS file-picker camera purpose string exists', appConfig.ios.filePickerCameraCapture === true && iosInfo.includes('<key>NSCameraUsageDescription</key>'));
expect('iOS video capture microphone purpose string exists', iosInfo.includes('<key>NSMicrophoneUsageDescription</key>'));
expect('iOS photo-picker purpose string exists', iosInfo.includes('<key>NSPhotoLibraryUsageDescription</key>'));
expect('iOS ad measurement is delayed until explicit initialization', iosInfo.includes('<key>GADDelayAppMeasurementInit</key>') && iosInfo.includes('<true/>'));
expect('iOS SKAdNetwork configuration exists', iosInfo.includes('cstr6suwn9.skadnetwork') && iosInfo.includes('4fzdc2evr5.skadnetwork'));
expect('iOS Universal Link entitlement exists', iosEntitlements.includes(`applinks:${expectedHost}`));
expect('AASA uses the registered Team ID and bundle ID', aasaRoute.includes(expectedAppleTeamId) && aasaRoute.includes(expectedIosId));
expect('Capacitor Community AdMob 8 is linked through its locally patched SPM package', iosPackage.includes('path: "../../../node_modules/@capacitor-community/admob"') && iosPackage.includes('CapacitorCommunityAdmob'));
expect('iOS Swift package paths are portable', !iosPackage.includes('\\'));
expect('iOS bridge uses supplied production banner ID', bridgeScript.includes(appConfig.ios.adMob.bannerUnitId));
expect('iOS bridge uses supplied production interstitial ID', bridgeScript.includes(appConfig.ios.adMob.interstitialUnitId));
expect('iOS development testing path uses Google test units', bridgeScript.includes(appConfig.ios.adMob.testBannerUnitId) && bridgeScript.includes(appConfig.ios.adMob.testInterstitialUnitId));
expect('iOS UMP consent gates ad requests', bridgeScript.includes('requestConsentInfo') && bridgeScript.includes('showConsentForm') && bridgeScript.includes('canRequestAds'));
expect(
  'iOS ads are non-personalized and do not request ATT',
  appConfig.ios.adMob.personalizedAds === false
    && !bridgeScript.includes('trackingAuthorizationStatus')
    && !bridgeScript.includes('requestTrackingAuthorization')
    && !bridgeScript.includes('trackingStatus')
    && (bridgeScript.match(/npa: true/g) || []).length >= 2,
);
expect(
  'Patched iOS AdMob plugin excludes ATT and publisher first-party ID',
  !iosAdmobPlugin.includes('AppTrackingTransparency')
    && !iosAdmobPlugin.includes('ATTrackingManager')
    && iosAdmobPlugin.includes('setPublisherFirstPartyIDEnabled(false)'),
);
expect('iOS ads avoid app-open placement', !bridgeScript.includes('showAppOpenAd') && !bridgeScript.includes('prepareAppOpenAd'));
expect('iOS banner uses a reserved top slot on eligible app routes', bridgeScript.includes("['/dashboard', '/history', '/team', '/upload']") && bridgeScript.includes("position: 'TOP_CENTER'"));
expect('iOS interstitial has cooldown and session cap', bridgeScript.includes(`LAUNCH_COOLDOWN_MS = ${appConfig.ios.adMob.interstitialLaunchCooldownSeconds}000`) && bridgeScript.includes(`MIN_INTERSTITIAL_INTERVAL_MS = ${appConfig.ios.adMob.interstitialMinimumIntervalSeconds}000`) && bridgeScript.includes(`SESSION_INTERSTITIAL_CAP = ${appConfig.ios.adMob.interstitialSessionCap}`));
expect(
  'iOS normalizer preserves AdMob, identity and committed artwork',
  iosNormalizer.includes('CapacitorCommunityAdmob')
    && iosNormalizer.includes(expectedIosId)
    && iosNormalizer.includes(expectedAppleTeamId)
    && iosNormalizer.includes('enforceNoTrackingAdMob')
    && iosNormalizer.includes('setPublisherFirstPartyIDEnabled(false)')
    && iosNormalizer.includes('verifyArtwork')
    && iosNormalizer.includes('AppIcon-512@2x.png')
    && iosNormalizer.includes('splash-2732x2732.png'),
);
expect('Artwork generator produces the required opaque PNG sizes', artworkGenerator.includes('canvasSize: 1024') && artworkGenerator.includes('canvasSize: 2732') && artworkGenerator.includes('hasAlpha: false') && artworkGenerator.includes('AppIcon-512@2x.png'));
expect('Codemagic workflow uploads build 13 without requesting beta review', codemagic.includes(`bundle_identifier: ${expectedIosId}`) && codemagic.includes('pattern: main') && codemagic.includes('MIN_IOS_BUILD_NUMBER: 13') && codemagic.includes('pnpm sync:ios') && codemagic.includes('xcode-project build-ipa') && !codemagic.includes('submit_to_testflight: true'));

expect('Signed-out landing exposes guest file transfer', homePage.includes('Send a file without an account') && homePage.includes('Continue without an account'));
expect('Upload UI allows guests without repeating account messaging', !uploadPage.includes('No account required') && !uploadPage.includes("if (!isAuthenticated) { router.push('/'); return }"));
expect('Guest session is HttpOnly, signed, and does not collect email', transferOwner.includes("httpOnly: true") && transferOwner.includes("name: 'HMAC'") && transferOwner.includes('email: null'));
expect('Every multipart route accepts the secure guest owner', authorizeRoute.includes('getTransferOwner') && partUrlsRoute.includes('getTransferOwner') && completeRoute.includes('getTransferOwner'));
expect('Database schema supports exactly one account or guest owner', guestMigration.includes('num_nonnulls(user_id, guest_id) = 1') && guestMigration.includes('shared_files_owner_check'));
expect('Public support page contains direct contact information', supportPage.includes('support@rcinc.app') && supportPage.includes('BoltShare Support'));

const artworkFiles = [
  'scripts/generate-ios-artwork.swift',
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png',
];
for (const path of artworkFiles) {
  try {
    const info = await stat(resolve(root, path));
    expect(`Artwork exists: ${path}`, info.size > 1000);
  } catch {
    expect(`Artwork exists: ${path}`, false);
  }
}

const prohibitedPermissions = [
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
];
for (const permission of prohibitedPermissions) {
  expect(`Manifest omits ${permission}`, !manifest.includes(permission));
}

for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.label}`);
if (failures.length) {
  console.error(`\n${failures.length} verification check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${checks.length} wrapper checks passed.`);
}
