package com.boltshare.rcinc;

final class AdMobConfig {
    static final String APP_ID = "ca-app-pub-9689004813456541~5109392456";

    private static final String PRODUCTION_BANNER = "ca-app-pub-9689004813456541/5572426889";
    private static final String PRODUCTION_INTERSTITIAL = "ca-app-pub-9689004813456541/7543984100";
    private static final String PRODUCTION_NATIVE = "ca-app-pub-9689004813456541/9016847875";

    private static final String TEST_BANNER = "ca-app-pub-3940256099942544/9214589741";
    private static final String TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712";
    private static final String TEST_NATIVE = "ca-app-pub-3940256099942544/2247696110";

    static final long INTERSTITIAL_LAUNCH_COOLDOWN_MS = 120_000L;
    static final long INTERSTITIAL_MIN_INTERVAL_MS = 180_000L;
    static final int INTERSTITIAL_ROUTE_THRESHOLD = 3;
    static final int INTERSTITIAL_SESSION_CAP = 24;

    static final long NATIVE_LAUNCH_COOLDOWN_MS = 120_000L;
    static final long NATIVE_MIN_INTERVAL_MS = 600_000L;

    private AdMobConfig() {}

    static String bannerUnitId() {
        return BuildConfig.DEBUG ? TEST_BANNER : PRODUCTION_BANNER;
    }

    static String interstitialUnitId() {
        return BuildConfig.DEBUG ? TEST_INTERSTITIAL : PRODUCTION_INTERSTITIAL;
    }

    static String nativeUnitId() {
        return BuildConfig.DEBUG ? TEST_NATIVE : PRODUCTION_NATIVE;
    }

    static long interstitialLaunchCooldownMs() {
        return BuildConfig.DEBUG ? 5_000L : INTERSTITIAL_LAUNCH_COOLDOWN_MS;
    }

    static long interstitialMinimumIntervalMs() {
        return BuildConfig.DEBUG ? 5_000L : INTERSTITIAL_MIN_INTERVAL_MS;
    }

    static long nativeLaunchCooldownMs() {
        return BuildConfig.DEBUG ? 5_000L : NATIVE_LAUNCH_COOLDOWN_MS;
    }

    static long nativeMinimumIntervalMs() {
        return BuildConfig.DEBUG ? 5_000L : NATIVE_MIN_INTERVAL_MS;
    }
}
