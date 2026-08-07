(function initializeBoltShareMobileBridge() {
  'use strict';

  var BRIDGE_VERSION = 6;
  if (window.__boltShareMobileBridgeVersion === BRIDGE_VERSION) return;
  var legacyBridgeAlreadyInstalled = Boolean(window.__boltShareMobileBridgeInstalled);
  window.__boltShareMobileBridgeInstalled = true;
  window.__boltShareMobileBridgeVersion = BRIDGE_VERSION;

  var APP_ORIGIN = 'https://boltshare.rcinc.app';
  var Capacitor = window.Capacitor;
  var plugins = Capacitor && Capacitor.Plugins ? Capacitor.Plugins : {};
  var platform = Capacitor && typeof Capacitor.getPlatform === 'function'
    ? Capacitor.getPlatform()
    : '';
  var App = plugins.App;
  var Share = plugins.Share;
  var Native = plugins.BoltShareNative;
  var AdMob = plugins.AdMob;

  function trustedAppUrl(rawUrl) {
    try {
      var parsed = new URL(rawUrl, APP_ORIGIN);
      if (parsed.protocol === 'boltshare:') {
        var customPath = parsed.pathname || '/';
        if (parsed.hostname && parsed.hostname !== 'open') {
          customPath = '/' + parsed.hostname + (customPath === '/' ? '' : customPath);
        } else if (parsed.hostname === 'open' && parsed.searchParams.get('path')) {
          customPath = parsed.searchParams.get('path');
        }
        parsed = new URL(customPath + parsed.search + parsed.hash, APP_ORIGIN);
      }
      return parsed.origin === APP_ORIGIN ? parsed : null;
    } catch {
      return null;
    }
  }

  function openTrustedUrl(rawUrl) {
    var target = trustedAppUrl(rawUrl);
    if (!target) return false;
    if (window.location.href !== target.href) window.location.assign(target.href);
    return true;
  }

  function installSafeAreaStyles() {
    if (document.getElementById('boltshare-native-safe-areas')) return;
    var style = document.createElement('style');
    style.id = 'boltshare-native-safe-areas';
    style.textContent = [
      'html{background:#0d0d0d}',
      ':root{',
      '--bs-safe-top:env(safe-area-inset-top,0px);',
      '--bs-safe-right:env(safe-area-inset-right,0px);',
      '--bs-safe-bottom:env(safe-area-inset-bottom,0px);',
      '--bs-safe-left:env(safe-area-inset-left,0px);',
      '}',
      'body{padding:0}',
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  function setBannerLayoutVisible(visible) {
    document.documentElement.style.setProperty('--bs-native-banner-space', visible ? '58px' : '0px');
  }

  function installNativeShareFallback() {
    if (!Share || typeof Share.share !== 'function' || typeof navigator.share === 'function') return;
    navigator.share = function (data) {
      return Share.share({
        title: data && data.title ? String(data.title) : 'BoltShare',
        text: data && data.text ? String(data.text) : undefined,
        url: data && data.url ? String(data.url) : undefined,
        dialogTitle: 'Share with',
      });
    };
    navigator.canShare = function () { return true; };
  }

  function installNativeDownloads() {
    if (!Native || typeof Native.download !== 'function') return;
    document.addEventListener('click', function (event) {
      var target = event.target;
      var anchor = target && target.closest ? target.closest('a[download]') : null;
      if (!anchor || !anchor.href || !/^https:\/\//i.test(anchor.href)) return;
      event.preventDefault();
      event.stopPropagation();
      Native.download({
        url: anchor.href,
        fileName: anchor.getAttribute('download') || 'BoltShare-download',
      }).catch(function (error) {
        console.warn('[BoltShare] Native download failed', error);
        window.location.assign(anchor.href);
      });
    }, true);
  }

  function createIosAdController() {
    if (platform !== 'ios' || !AdMob || typeof AdMob.initialize !== 'function') return null;

    var PRODUCTION_BANNER_ID = 'ca-app-pub-9689004813456541/2838951715';
    var PRODUCTION_INTERSTITIAL_ID = 'ca-app-pub-9689004813456541/9715497040';
    var TEST_BANNER_ID = 'ca-app-pub-3940256099942544/2435281174';
    var TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/4411468910';
    var LAUNCH_COOLDOWN_MS = 120000;
    var MIN_INTERSTITIAL_INTERVAL_MS = 180000;
    var SESSION_INTERSTITIAL_CAP = 12;
    var ELIGIBLE_BANNER_PATHS = ['/dashboard', '/history', '/team', '/upload'];

    var launchedAt = Date.now();
    var initialized = false;
    var initializing = false;
    var canRequestAds = false;
    var privacyOptionsRequired = false;
    var bannerVisible = false;
    var interstitialReady = false;
    var interstitialPreparing = false;
    var lastInterstitialAt = 0;
    var sessionInterstitialCount = 0;
    var trackingStatus = 'notDetermined';

    var isTesting = false;
    try {
      var current = new URL(window.location.href);
      if (current.searchParams.get('admobTest') === '1') {
        window.localStorage.setItem('bs_ios_admob_test', '1');
        current.searchParams.delete('admobTest');
        window.history.replaceState(window.history.state, '', current.pathname + current.search + current.hash);
      }
      isTesting = window.localStorage.getItem('bs_ios_admob_test') === '1';
    } catch {}

    function adId(production, testing) {
      return isTesting ? testing : production;
    }

    function isBannerPath(path) {
      return ELIGIBLE_BANNER_PATHS.some(function (eligible) {
        return path === eligible || path.indexOf(eligible + '/') === 0;
      });
    }

    function revealPrivacyEntry(required) {
      privacyOptionsRequired = Boolean(required);
      document.querySelectorAll('[data-boltshare-ad-privacy]').forEach(function (element) {
        element.style.display = privacyOptionsRequired ? 'flex' : 'none';
      });
    }

    function refreshPrivacyEntry() {
      revealPrivacyEntry(privacyOptionsRequired);
    }

    function prepareInterstitial() {
      if (!initialized || !canRequestAds || interstitialReady || interstitialPreparing) return Promise.resolve();
      interstitialPreparing = true;
      return AdMob.prepareInterstitial({
        adId: adId(PRODUCTION_INTERSTITIAL_ID, TEST_INTERSTITIAL_ID),
        isTesting: isTesting,
        npa: trackingStatus !== 'authorized',
      }).then(function () {
        interstitialReady = true;
      }).catch(function (error) {
        console.warn('[BoltShare] iOS interstitial failed to prepare', error);
      }).finally(function () {
        interstitialPreparing = false;
      });
    }

    function hideBanner() {
      if (!bannerVisible) {
        setBannerLayoutVisible(false);
        return Promise.resolve();
      }
      bannerVisible = false;
      setBannerLayoutVisible(false);
      if (typeof AdMob.hideBanner === 'function') {
        return AdMob.hideBanner().catch(function () {});
      }
      if (typeof AdMob.removeBanner === 'function') {
        return AdMob.removeBanner().catch(function () {});
      }
      return Promise.resolve();
    }

    function showBannerForPath(path) {
      if (!initialized || !canRequestAds || !isBannerPath(path)) return hideBanner();
      if (bannerVisible) {
        setBannerLayoutVisible(true);
        return Promise.resolve();
      }

      return AdMob.showBanner({
        adId: adId(PRODUCTION_BANNER_ID, TEST_BANNER_ID),
        adSize: 'ADAPTIVE_BANNER',
        position: 'TOP_CENTER',
        margin: 0,
        isTesting: isTesting,
        npa: trackingStatus !== 'authorized',
      }).then(function () {
        bannerVisible = true;
        setBannerLayoutVisible(true);
      }).catch(function (error) {
        bannerVisible = false;
        setBannerLayoutVisible(false);
        console.warn('[BoltShare] iOS banner failed to load', error);
      });
    }

    function requestTrackingIfAppropriate() {
      if (typeof AdMob.trackingAuthorizationStatus !== 'function') return Promise.resolve();
      return AdMob.trackingAuthorizationStatus().then(function (result) {
        trackingStatus = result && result.status ? result.status : trackingStatus;
        if (trackingStatus !== 'notDetermined' || typeof AdMob.requestTrackingAuthorization !== 'function') return;
        return new Promise(function (resolve) {
          function requestWhenActive() {
            if (document.visibilityState !== 'visible') return;
            document.removeEventListener('visibilitychange', requestWhenActive);
            // iPadOS only presents ATT while the app is active and no other
            // permission alert is being dismissed. Let the launch settle first.
            window.setTimeout(resolve, 700);
          }
          document.addEventListener('visibilitychange', requestWhenActive);
          requestWhenActive();
        }).then(function () {
          return AdMob.requestTrackingAuthorization();
        }).then(function () {
          return AdMob.trackingAuthorizationStatus();
        }).then(function (updated) {
          trackingStatus = updated && updated.status ? updated.status : trackingStatus;
        });
      }).catch(function () {});
    }

    function updateConsent() {
      if (typeof AdMob.requestConsentInfo !== 'function') {
        canRequestAds = true;
        return Promise.resolve();
      }

      return AdMob.requestConsentInfo().then(function (info) {
        privacyOptionsRequired = Boolean(
          info && info.privacyOptionsRequirementStatus === 'REQUIRED'
        );
        revealPrivacyEntry(privacyOptionsRequired);

        if (info && !info.canRequestAds && info.isConsentFormAvailable && typeof AdMob.showConsentForm === 'function') {
          return AdMob.showConsentForm().then(function (updated) {
            canRequestAds = Boolean(updated && updated.canRequestAds);
            privacyOptionsRequired = Boolean(
              updated && updated.privacyOptionsRequirementStatus === 'REQUIRED'
            );
            revealPrivacyEntry(privacyOptionsRequired);
          });
        }

        canRequestAds = !info || Boolean(info.canRequestAds);
      });
    }

    function initialize() {
      if (initialized || initializing) return Promise.resolve();
      initializing = true;
      // Resolve ATT before initializing measurement or requesting consent/ads.
      // Denial never blocks the app; all ad requests remain non-personalized.
      return requestTrackingIfAppropriate().then(function () {
        return AdMob.initialize({
        initializeForTesting: isTesting,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        maxAdContentRating: 'ParentalGuidance',
        });
      }).then(function () {
        return updateConsent();
      }).then(function () {
        initialized = true;
        return Promise.all([
          showBannerForPath(window.location.pathname || '/'),
          prepareInterstitial(),
        ]);
      }).catch(function (error) {
        console.warn('[BoltShare] iOS AdMob initialization failed', error);
      }).finally(function () {
        initializing = false;
      });
    }

    function routeChanged(path) {
      if (!initialized) {
        initialize().then(function () {
          showBannerForPath(path);
        });
        return;
      }
      showBannerForPath(path);
      prepareInterstitial();
      refreshPrivacyEntry();
    }

    function naturalBreak() {
      if (!initialized || !canRequestAds) return;
      if (Date.now() - launchedAt < LAUNCH_COOLDOWN_MS) return;
      if (Date.now() - lastInterstitialAt < MIN_INTERSTITIAL_INTERVAL_MS) return;
      if (sessionInterstitialCount >= SESSION_INTERSTITIAL_CAP) return;

      if (!interstitialReady) {
        prepareInterstitial();
        return;
      }

      interstitialReady = false;
      lastInterstitialAt = Date.now();
      sessionInterstitialCount += 1;
      hideBanner().then(function () {
        return AdMob.showInterstitial();
      }).catch(function (error) {
        console.warn('[BoltShare] iOS interstitial failed to show', error);
      }).finally(function () {
        window.setTimeout(function () {
          showBannerForPath(window.location.pathname || '/');
          prepareInterstitial();
        }, 450);
      });
    }

    function showPrivacyOptions() {
      if (typeof AdMob.showPrivacyOptionsForm !== 'function') return Promise.resolve();
      return AdMob.showPrivacyOptionsForm().then(function () {
        return updateConsent();
      }).then(function () {
        return showBannerForPath(window.location.pathname || '/');
      });
    }

    if (typeof AdMob.addListener === 'function') {
      AdMob.addListener('interstitialAdDismissed', function () {
        window.setTimeout(prepareInterstitial, 350);
      }).catch(function () {});
      AdMob.addListener('interstitialAdFailedToShow', function () {
        interstitialReady = false;
        window.setTimeout(prepareInterstitial, 1000);
      }).catch(function () {});
    }

    window.setTimeout(initialize, 600);
    return {
      routeChanged: routeChanged,
      naturalBreak: naturalBreak,
      refreshPrivacyEntry: refreshPrivacyEntry,
      showPrivacyOptions: showPrivacyOptions,
    };
  }

  function installAdSignals() {
    var iosAds = createIosAdController();
    if (!Native && !iosAds) return;

    var lastReportedPath = '';

    function refreshPrivacyEntry() {
      if (iosAds) iosAds.refreshPrivacyEntry();
      if (!Native || typeof Native.getAdPrivacyStatus !== 'function') return;
      Native.getAdPrivacyStatus().then(function (status) {
        if (!status || !status.required) return;
        document.querySelectorAll('[data-boltshare-ad-privacy]').forEach(function (element) {
          element.style.display = 'flex';
        });
      }).catch(function () {});
    }

    function reportRoute() {
      var path = window.location.pathname || '/';
      if (path === lastReportedPath) {
        refreshPrivacyEntry();
        return;
      }
      lastReportedPath = path;
      if (Native && typeof Native.routeChanged === 'function') {
        Native.routeChanged({ path: path }).catch(function () {});
      }
      if (iosAds) iosAds.routeChanged(path);
      window.setTimeout(refreshPrivacyEntry, 0);
    }

    function naturalBreak(eventName) {
      if (Native && typeof Native.naturalBreak === 'function') {
        Native.naturalBreak({ event: String(eventName || '') }).catch(function () {});
      }
      if (iosAds) iosAds.naturalBreak(String(eventName || ''));
    }

    document.addEventListener('boltshare:natural-break', function (event) {
      var detail = event && event.detail ? event.detail : {};
      naturalBreak(detail.event);
    });

    var originalPushState = window.history.pushState;
    var originalReplaceState = window.history.replaceState;
    window.history.pushState = function () {
      var result = originalPushState.apply(this, arguments);
      window.setTimeout(reportRoute, 0);
      return result;
    };
    window.history.replaceState = function () {
      var result = originalReplaceState.apply(this, arguments);
      window.setTimeout(reportRoute, 0);
      return result;
    };
    window.addEventListener('popstate', reportRoute);

    document.addEventListener('click', function (event) {
      var target = event.target;
      var privacyButton = target && target.closest ? target.closest('[data-boltshare-ad-privacy]') : null;
      if (!privacyButton) return;
      if (iosAds) {
        event.preventDefault();
        iosAds.showPrivacyOptions().catch(function () {});
        return;
      }
      if (Native && typeof Native.showAdPrivacyOptions === 'function') {
        event.preventDefault();
        Native.showAdPrivacyOptions().catch(function () {});
      }
    });

    window.BoltShareAds = { naturalBreak: naturalBreak };
    reportRoute();
  }

  function initializeDeepLinksAndBackButton() {
    if (!App) return;
    if (typeof App.addListener === 'function') {
      App.addListener('appUrlOpen', function (event) {
        if (event && event.url) openTrustedUrl(event.url);
      });
      App.addListener('backButton', function (event) {
        if (event && event.canGoBack) window.history.back();
        else if (typeof App.minimizeApp === 'function') App.minimizeApp();
      });
    }
    if (typeof App.getLaunchUrl === 'function') {
      App.getLaunchUrl().then(function (launch) {
        if (launch && launch.url) openTrustedUrl(launch.url);
      }).catch(function () {});
    }
  }

  if (!legacyBridgeAlreadyInstalled) {
    installSafeAreaStyles();
    installNativeShareFallback();
    installNativeDownloads();
    initializeDeepLinksAndBackButton();
  }
  installAdSignals();
})();
