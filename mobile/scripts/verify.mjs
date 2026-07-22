import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const failures = [];
const checks = [];

function expect(label, condition) {
  checks.push({ label, ok: Boolean(condition) });
  if (!condition) failures.push(label);
}

const [appConfigText, capConfigText, manifest, gradle, strings, activity, nativePlugin, adsManager, adsConfig, nativeAdLayout, webClient, bridgeScript, publicBridgeScript, privacyPolicy, appAdsText, iosInfo, iosEntitlements, iosProject, iosPackage] = await Promise.all([
  read('app.config.json'),
  read('capacitor.config.json'),
  read('android/app/src/main/AndroidManifest.xml'),
  read('android/app/build.gradle'),
  read('android/app/src/main/res/values/strings.xml'),
  read('android/app/src/main/java/app/rcinc/boltshare/MainActivity.java'),
  read('android/app/src/main/java/app/rcinc/boltshare/BoltShareNativePlugin.java'),
  read('android/app/src/main/java/app/rcinc/boltshare/BoltShareAdsManager.java'),
  read('android/app/src/main/java/app/rcinc/boltshare/AdMobConfig.java'),
  read('android/app/src/main/res/layout/view_native_ad.xml'),
  read('android/app/src/main/java/app/rcinc/boltshare/BoltShareWebViewClient.java'),
  read('www/remote-bridge.js'),
  read('../public/mobile-bridge.js'),
  read('../app/privacy/page.tsx'),
  read('../app/app-ads.txt/route.ts'),
  read('ios/App/App/Info.plist'),
  read('ios/App/App/App.entitlements'),
  read('ios/App/App.xcodeproj/project.pbxproj'),
  read('ios/App/CapApp-SPM/Package.swift'),
]);

const appConfig = JSON.parse(appConfigText);
const capConfig = JSON.parse(capConfigText);
const expectedId = appConfig.identity.androidPackage;
const expectedVersion = appConfig.app.versionName;
const expectedCode = appConfig.app.versionCode;
const expectedHost = new URL(appConfig.web.url).host;

expect('Capacitor app ID matches app config', capConfig.appId === expectedId);
expect('Capacitor URL is HTTPS', new URL(capConfig.server.url).protocol === 'https:');
expect('Capacitor navigation is restricted to the app host', capConfig.server.allowNavigation.length === 1 && capConfig.server.allowNavigation[0] === expectedHost);
expect('Android application ID matches', gradle.includes(`applicationId "${expectedId}"`));
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
expect('Web-deployed and Android-injected bridges match', bridgeScript.trim() === publicBridgeScript.trim());
expect('Injected bridge upgrades an older deployed bridge safely', bridgeScript.includes('BRIDGE_VERSION = 2') && bridgeScript.includes('legacyBridgeAlreadyInstalled') && bridgeScript.includes('installAdSignals();'));
expect('AdMob feature is enabled in app config', appConfig.features.ads === true);
expect('AdMob application ID matches app config', manifest.includes(`android:value="${appConfig.android.adMob.appId}"`));
expect('Google Mobile Ads and UMP dependencies exist', gradle.includes('play-services-ads:25.4.0') && gradle.includes('user-messaging-platform:4.0.0'));
expect('Production banner unit matches app config', adsConfig.includes(appConfig.android.adMob.bannerUnitId));
expect('Production interstitial unit matches app config', adsConfig.includes(appConfig.android.adMob.interstitialUnitId));
expect('Production native unit matches app config', adsConfig.includes(appConfig.android.adMob.nativeUnitId));
expect('Debug builds use Google test ad units', adsConfig.includes('ca-app-pub-3940256099942544/9214589741') && adsConfig.includes('ca-app-pub-3940256099942544/1033173712') && adsConfig.includes('ca-app-pub-3940256099942544/2247696110'));
expect('Banner is centered in a reserved native slot', adsManager.includes('Gravity.TOP | Gravity.CENTER_HORIZONTAL') && adsManager.includes('AdSize.BANNER'));
expect('UMP gates ad requests on current consent', adsManager.includes('requestConsentInfoUpdate') && adsManager.includes('loadAndShowConsentFormIfRequired') && adsManager.includes('canRequestAds()'));
expect('Interstitial natural-break bridge exists', nativePlugin.includes('naturalBreak(PluginCall call)') && bridgeScript.includes('boltshare:natural-break'));
expect('Interstitial policy controls match app config', adsConfig.includes(`INTERSTITIAL_LAUNCH_COOLDOWN_MS = ${appConfig.android.adMob.interstitialLaunchCooldownSeconds}_000L`) && adsConfig.includes(`INTERSTITIAL_MIN_INTERVAL_MS = ${appConfig.android.adMob.interstitialMinimumIntervalSeconds}_000L`) && adsConfig.includes(`INTERSTITIAL_ROUTE_THRESHOLD = ${appConfig.android.adMob.interstitialRouteThreshold}`) && adsConfig.includes(`INTERSTITIAL_SESSION_CAP = ${appConfig.android.adMob.interstitialSessionCap}`));
expect('Native ad is clearly labelled and has AdChoices', strings.includes('<string name="native_ad_label">Ad</string>') && nativeAdLayout.includes('android:text="@string/native_ad_label"') && nativeAdLayout.includes('AdChoicesView'));
expect('Ad privacy choices bridge exists', nativePlugin.includes('showAdPrivacyOptions') && bridgeScript.includes('data-boltshare-ad-privacy'));
expect('Privacy policy discloses Google AdMob', privacyPolicy.includes('Google AdMob') && privacyPolicy.includes('Advertising data in the Android app'));
expect('app-ads.txt declares the AdMob publisher', appAdsText.includes('pub-9689004813456541') && appAdsText.includes('f08c47fec0942fa0'));
expect('iOS bundle ID matches', iosProject.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${appConfig.identity.iosBundleId};`));
expect('iOS version name matches', iosProject.includes(`MARKETING_VERSION = ${expectedVersion};`));
expect('iOS build number matches', iosProject.includes(`CURRENT_PROJECT_VERSION = ${expectedCode};`));
expect('iOS deployment target matches', iosProject.includes(`IPHONEOS_DEPLOYMENT_TARGET = ${appConfig.ios.deploymentTarget};`));
expect('iOS custom URL scheme exists', iosInfo.includes(`<string>${appConfig.identity.urlScheme}</string>`));
expect('iOS Universal Link entitlement exists', iosEntitlements.includes(`applinks:${expectedHost}`));
expect('iOS Swift package paths are portable', !iosPackage.includes('\\'));

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
