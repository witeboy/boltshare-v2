(function initializeBoltShareMobileBridge() {
  'use strict';

  var BRIDGE_VERSION = 2;
  if (window.__boltShareMobileBridgeVersion === BRIDGE_VERSION) return;
  var legacyBridgeAlreadyInstalled = Boolean(window.__boltShareMobileBridgeInstalled);
  window.__boltShareMobileBridgeInstalled = true;
  window.__boltShareMobileBridgeVersion = BRIDGE_VERSION;

  var APP_ORIGIN = 'https://boltshare.rcinc.app';
  var Capacitor = window.Capacitor;
  var plugins = Capacitor && Capacitor.Plugins ? Capacitor.Plugins : {};
  var App = plugins.App;
  var Share = plugins.Share;
  var Native = plugins.BoltShareNative;

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
    style.textContent = 'html{background:#0d0d0d}body{padding-top:env(safe-area-inset-top);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}';
    (document.head || document.documentElement).appendChild(style);
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

  function installAdSignals() {
    if (!Native) return;

    var lastReportedPath = '';
    function refreshPrivacyEntry() {
      if (typeof Native.getAdPrivacyStatus !== 'function') return;
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
      if (typeof Native.routeChanged === 'function') {
        Native.routeChanged({ path: path }).catch(function () {});
      }
      window.setTimeout(refreshPrivacyEntry, 0);
    }

    function naturalBreak(eventName) {
      if (typeof Native.naturalBreak !== 'function') return;
      Native.naturalBreak({ event: String(eventName || '') }).catch(function () {});
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
      if (!privacyButton || typeof Native.showAdPrivacyOptions !== 'function') return;
      event.preventDefault();
      Native.showAdPrivacyOptions().catch(function () {});
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
