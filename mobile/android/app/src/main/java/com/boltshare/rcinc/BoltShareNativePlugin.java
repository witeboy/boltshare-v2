package com.boltshare.rcinc;

import android.Manifest;
import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.Locale;

@CapacitorPlugin(
    name = "BoltShareNative",
    permissions = @Permission(strings = Manifest.permission.WRITE_EXTERNAL_STORAGE, alias = "legacyStorage")
)
public class BoltShareNativePlugin extends Plugin {
    @Override
    public void load() {
        bridge.setWebViewClient(new BoltShareWebViewClient(bridge));
        super.load();
    }

    @PluginMethod
    public void download(PluginCall call) {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P && getPermissionState("legacyStorage") != PermissionState.GRANTED) {
            requestPermissionForAlias("legacyStorage", call, "storagePermissionCallback");
            return;
        }
        enqueueDownload(call);
    }

    @PluginMethod
    public void naturalBreak(PluginCall call) {
        BoltShareAdsManager ads = adsManager();
        if (ads != null) ads.onNaturalBreak(call.getString("event"));
        call.resolve();
    }

    @PluginMethod
    public void routeChanged(PluginCall call) {
        BoltShareAdsManager ads = adsManager();
        if (ads != null) ads.onRouteChanged(call.getString("path"));
        call.resolve();
    }

    @PluginMethod
    public void getAdPrivacyStatus(PluginCall call) {
        BoltShareAdsManager ads = adsManager();
        JSObject result = new JSObject();
        result.put("required", ads != null && ads.isPrivacyOptionsRequired());
        call.resolve(result);
    }

    @PluginMethod
    public void showAdPrivacyOptions(PluginCall call) {
        BoltShareAdsManager ads = adsManager();
        if (ads == null) {
            call.reject("Ad privacy options are not available.");
            return;
        }
        ads.showPrivacyOptions();
        call.resolve();
    }

    private BoltShareAdsManager adsManager() {
        if (!(getActivity() instanceof MainActivity)) return null;
        return ((MainActivity) getActivity()).getAdsManager();
    }

    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        if (getPermissionState("legacyStorage") == PermissionState.GRANTED) enqueueDownload(call);
        else call.reject("Storage permission is required to save this download.");
    }

    private void enqueueDownload(PluginCall call) {
        String rawUrl = call.getString("url");
        if (rawUrl == null) {
            call.reject("A download URL is required.");
            return;
        }

        Uri uri = Uri.parse(rawUrl);
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
            call.reject("Only HTTPS downloads are allowed.");
            return;
        }

        String requestedName = call.getString("fileName");
        String fileName = sanitizeFileName(requestedName, rawUrl);
        DownloadManager.Request request = new DownloadManager.Request(uri)
            .setTitle(fileName)
            .setDescription("Downloading from BoltShare")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(false)
            .setMimeType(guessMimeType(fileName))
            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

        String cookies = CookieManager.getInstance().getCookie(rawUrl);
        if (cookies != null && !cookies.trim().isEmpty()) request.addRequestHeader("Cookie", cookies);
        request.addRequestHeader("User-Agent", bridge.getWebView().getSettings().getUserAgentString());

        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) {
            call.reject("Android download service is unavailable.");
            return;
        }

        try {
            long downloadId = manager.enqueue(request);
            JSObject result = new JSObject();
            result.put("downloadId", downloadId);
            result.put("fileName", fileName);
            call.resolve(result);
        } catch (RuntimeException error) {
            call.reject("Unable to start download.", error);
        }
    }

    private String sanitizeFileName(String requestedName, String rawUrl) {
        String candidate = requestedName;
        if (candidate == null || candidate.trim().isEmpty() || "BoltShare-download".equals(candidate)) {
            candidate = URLUtil.guessFileName(rawUrl, null, null);
        }
        candidate = candidate.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        candidate = candidate.replaceAll("^[. ]+|[. ]+$", "");
        if (candidate.isEmpty()) candidate = "BoltShare-download";
        return candidate.length() > 180 ? candidate.substring(0, 180) : candidate;
    }

    private String guessMimeType(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) return "application/octet-stream";
        String extension = fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
        String type = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        return type == null ? "application/octet-stream" : type;
    }
}
