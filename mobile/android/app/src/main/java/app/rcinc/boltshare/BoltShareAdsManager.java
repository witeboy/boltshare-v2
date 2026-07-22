package app.rcinc.boltshare;

import android.app.Activity;
import android.graphics.drawable.Drawable;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.Nullable;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdView;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

final class BoltShareAdsManager {
    private static final String LOG_TAG = "BoltShareAds";
    private static final Set<String> NATURAL_BREAKS = new HashSet<>(Arrays.asList(
        "upload_completed",
        "download_completed",
        "transfer_completed",
        "session_completed"
    ));

    private static final Set<String> MEANINGFUL_ROUTES = new HashSet<>(Arrays.asList(
        "dashboard",
        "history",
        "upload",
        "receive",
        "receive-code",
        "team",
        "settings",
        "analytics"
    ));

    private static final Set<String> NATIVE_ROUTES = new HashSet<>(Arrays.asList(
        "dashboard",
        "history",
        "team"
    ));

    private final MainActivity activity;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final long sessionStartedAt = SystemClock.elapsedRealtime();

    private FrameLayout bannerContainer;
    private FrameLayout nativeContainer;
    private AdView bannerView;
    private InterstitialAd interstitialAd;
    private NativeAd nativeAd;
    private NativeAdView nativeAdView;
    private ConsentInformation consentInformation;

    private boolean adsInitializationStarted;
    private boolean adsInitialized;
    private boolean interstitialLoading;
    private boolean nativeLoading;
    private boolean activityResumed;
    private boolean nativeRouteEligible;
    private boolean destroyed;
    private int interstitialCount;
    private int routeTransitions;
    private long lastInterstitialShownAt;
    private long lastNativeShownAt;
    private String lastMeaningfulRoute = "";

    BoltShareAdsManager(MainActivity activity, WebView webView) {
        this.activity = activity;
        installReservedAdSlots(webView);
        gatherConsentAndInitialize();
        mainHandler.postDelayed(this::maybeLoadNative, AdMobConfig.nativeLaunchCooldownMs());
    }

    private void installReservedAdSlots(WebView webView) {
        ViewGroup originalParent = (ViewGroup) webView.getParent();
        int originalIndex = originalParent.indexOfChild(webView);
        originalParent.removeView(webView);

        LinearLayout column = new LinearLayout(activity);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setBackgroundColor(0xFF0D0D0D);

        bannerContainer = new FrameLayout(activity);
        bannerContainer.setVisibility(View.GONE);
        bannerContainer.setBackgroundColor(0xFF0D0D0D);
        ViewCompat.setOnApplyWindowInsetsListener(bannerContainer, (view, insets) -> {
            int top = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
            view.setPadding(0, top, 0, 0);
            return insets;
        });

        nativeContainer = new FrameLayout(activity);
        nativeContainer.setVisibility(View.GONE);
        nativeContainer.setBackgroundColor(0xFF0D0D0D);
        int horizontalPadding = dp(8);
        nativeContainer.setPadding(horizontalPadding, dp(4), horizontalPadding, dp(6));

        column.addView(bannerContainer, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        column.addView(webView, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1f
        ));
        column.addView(nativeContainer, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        originalParent.addView(column, originalIndex, new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        ViewCompat.requestApplyInsets(bannerContainer);
    }

    private void gatherConsentAndInitialize() {
        consentInformation = UserMessagingPlatform.getConsentInformation(activity);
        ConsentRequestParameters parameters = new ConsentRequestParameters.Builder().build();

        consentInformation.requestConsentInfoUpdate(
            activity,
            parameters,
            () -> {
                startAdsIfAllowed();
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> startAdsIfAllowed());
            },
            requestConsentError -> startAdsIfAllowed()
        );
    }

    private void startAdsIfAllowed() {
        if (destroyed || adsInitializationStarted || consentInformation == null || !consentInformation.canRequestAds()) return;
        adsInitializationStarted = true;
        MobileAds.initialize(activity, initializationStatus -> activity.runOnUiThread(() -> {
            if (destroyed) return;
            adsInitialized = true;
            loadBanner();
            loadInterstitial();
            maybeLoadNative();
        }));
    }

    private void loadBanner() {
        if (!adsInitialized || bannerView != null || destroyed) return;
        bannerView = new AdView(activity);
        bannerView.setAdUnitId(AdMobConfig.bannerUnitId());
        bannerView.setAdSize(AdSize.BANNER);
        bannerView.setAdListener(new AdListener() {
            @Override
            public void onAdLoaded() {
                Log.d(LOG_TAG, "Banner loaded");
                if (!destroyed) bannerContainer.setVisibility(View.VISIBLE);
            }

            @Override
            public void onAdFailedToLoad(LoadAdError error) {
                Log.w(LOG_TAG, "Banner failed to load: " + error);
                bannerContainer.setVisibility(View.GONE);
            }
        });

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(dp(320), ViewGroup.LayoutParams.WRAP_CONTENT);
        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        bannerContainer.removeAllViews();
        bannerContainer.addView(bannerView, params);
        bannerView.loadAd(new AdRequest.Builder().build());
    }

    private void loadInterstitial() {
        if (!adsInitialized || destroyed || interstitialLoading || interstitialAd != null || interstitialCount >= AdMobConfig.INTERSTITIAL_SESSION_CAP) return;
        interstitialLoading = true;
        InterstitialAd.load(
            activity,
            AdMobConfig.interstitialUnitId(),
            new AdRequest.Builder().build(),
            new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(InterstitialAd loadedAd) {
                    interstitialLoading = false;
                    if (destroyed) return;
                    interstitialAd = loadedAd;
                    Log.d(LOG_TAG, "Interstitial preloaded");
                }

                @Override
                public void onAdFailedToLoad(LoadAdError error) {
                    interstitialLoading = false;
                    interstitialAd = null;
                    Log.w(LOG_TAG, "Interstitial failed to load: " + error);
                }
            }
        );
    }

    void onNaturalBreak(String rawEvent) {
        String event = rawEvent == null ? "" : rawEvent.trim().toLowerCase(Locale.ROOT);
        if (!NATURAL_BREAKS.contains(event)) return;
        Log.d(LOG_TAG, "Accepted natural break: " + event);
        mainHandler.postDelayed(() -> tryShowInterstitial(true), 700L);
    }

    void onRouteChanged(String path) {
        mainHandler.post(() -> handleRouteChanged(path));
    }

    private void handleRouteChanged(String path) {
        String route = routeCategory(path);
        nativeRouteEligible = NATIVE_ROUTES.contains(route) || (BuildConfig.DEBUG && route.isEmpty());

        if (!nativeRouteEligible) {
            clearNativeAd();
        } else {
            maybeLoadNative();
        }

        if (!MEANINGFUL_ROUTES.contains(route) || route.equals(lastMeaningfulRoute)) return;
        if (!lastMeaningfulRoute.isEmpty()) routeTransitions++;
        lastMeaningfulRoute = route;
        if (routeTransitions >= AdMobConfig.INTERSTITIAL_ROUTE_THRESHOLD) {
            mainHandler.postDelayed(() -> tryShowInterstitial(false), 700L);
        }
    }

    private boolean tryShowInterstitial(boolean explicitNaturalBreak) {
        long now = SystemClock.elapsedRealtime();
        if (destroyed || !activityResumed || interstitialAd == null || interstitialCount >= AdMobConfig.INTERSTITIAL_SESSION_CAP) return false;
        if (now - sessionStartedAt < AdMobConfig.interstitialLaunchCooldownMs()) return false;
        if (interstitialCount > 0 && now - lastInterstitialShownAt < AdMobConfig.interstitialMinimumIntervalMs()) return false;
        if (!explicitNaturalBreak && routeTransitions < AdMobConfig.INTERSTITIAL_ROUTE_THRESHOLD) return false;

        InterstitialAd adToShow = interstitialAd;
        interstitialAd = null;
        adToShow.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                loadInterstitial();
            }

            @Override
            public void onAdFailedToShowFullScreenContent(com.google.android.gms.ads.AdError adError) {
                loadInterstitial();
            }
        });
        interstitialCount++;
        lastInterstitialShownAt = now;
        routeTransitions = 0;
        Log.d(LOG_TAG, "Showing interstitial #" + interstitialCount);
        adToShow.show(activity);
        return true;
    }

    private void maybeLoadNative() {
        long now = SystemClock.elapsedRealtime();
        if (!adsInitialized || destroyed || !nativeRouteEligible || nativeLoading || nativeAd != null) return;
        if (now - sessionStartedAt < AdMobConfig.nativeLaunchCooldownMs()) return;
        if (lastNativeShownAt > 0 && now - lastNativeShownAt < AdMobConfig.nativeMinimumIntervalMs()) return;

        nativeLoading = true;
        new AdLoader.Builder(activity, AdMobConfig.nativeUnitId())
            .forNativeAd(loadedAd -> {
                nativeLoading = false;
                if (destroyed || !nativeRouteEligible) {
                    loadedAd.destroy();
                    return;
                }
                nativeAd = loadedAd;
                showNativeAd(loadedAd);
            })
            .withAdListener(new AdListener() {
                @Override
                public void onAdFailedToLoad(LoadAdError error) {
                    nativeLoading = false;
                    Log.w(LOG_TAG, "Native ad failed to load: " + error);
                }
            })
            .build()
            .loadAd(new AdRequest.Builder().build());
    }

    private void showNativeAd(NativeAd ad) {
        NativeAdView view = (NativeAdView) LayoutInflater.from(activity).inflate(R.layout.view_native_ad, nativeContainer, false);
        TextView headline = view.findViewById(R.id.ad_headline);
        TextView body = view.findViewById(R.id.ad_body);
        Button callToAction = view.findViewById(R.id.ad_call_to_action);
        ImageView icon = view.findViewById(R.id.ad_app_icon);

        headline.setText(ad.getHeadline());
        view.setHeadlineView(headline);

        if (ad.getBody() == null) body.setVisibility(View.GONE);
        else body.setText(ad.getBody());
        view.setBodyView(body);

        if (ad.getCallToAction() == null) callToAction.setVisibility(View.GONE);
        else callToAction.setText(ad.getCallToAction());
        view.setCallToActionView(callToAction);

        Drawable iconDrawable = ad.getIcon() == null ? null : ad.getIcon().getDrawable();
        if (iconDrawable == null) icon.setVisibility(View.GONE);
        else icon.setImageDrawable(iconDrawable);
        view.setIconView(icon);

        view.setAdChoicesView(view.findViewById(R.id.ad_choices));
        view.setNativeAd(ad);
        nativeAdView = view;
        nativeContainer.removeAllViews();
        nativeContainer.addView(view, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        nativeContainer.setVisibility(View.VISIBLE);
        lastNativeShownAt = SystemClock.elapsedRealtime();
        Log.d(LOG_TAG, "Native ad displayed");
    }

    private void clearNativeAd() {
        nativeContainer.setVisibility(View.GONE);
        nativeContainer.removeAllViews();
        if (nativeAdView != null) {
            nativeAdView.destroy();
            nativeAdView = null;
        }
        if (nativeAd != null) {
            nativeAd.destroy();
            nativeAd = null;
        }
    }

    boolean isPrivacyOptionsRequired() {
        return consentInformation != null && consentInformation.getPrivacyOptionsRequirementStatus()
            == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }

    void showPrivacyOptions() {
        mainHandler.post(() -> UserMessagingPlatform.showPrivacyOptionsForm(
            activity,
            formError -> startAdsIfAllowed()
        ));
    }

    void onResume() {
        activityResumed = true;
        if (bannerView != null) bannerView.resume();
    }

    void onPause() {
        activityResumed = false;
        if (bannerView != null) bannerView.pause();
    }

    void destroy() {
        destroyed = true;
        mainHandler.removeCallbacksAndMessages(null);
        if (bannerView != null) {
            bannerView.destroy();
            bannerView = null;
        }
        interstitialAd = null;
        clearNativeAd();
    }

    private String routeCategory(@Nullable String path) {
        if (path == null) return "";
        String normalized = path.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("/file-analytics/")) return "analytics";
        if (normalized.startsWith("/receive/")) return "receive";
        if (normalized.startsWith("/")) normalized = normalized.substring(1);
        int slash = normalized.indexOf('/');
        return slash >= 0 ? normalized.substring(0, slash) : normalized;
    }

    private int dp(int value) {
        return Math.round(value * activity.getResources().getDisplayMetrics().density);
    }
}
