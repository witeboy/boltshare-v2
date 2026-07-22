package app.rcinc.boltshare;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

final class BoltShareWebViewClient extends BridgeWebViewClient {
    private static final String APP_HOST = "boltshare.rcinc.app";
    private static final String BRIDGE_ASSET = "public/remote-bridge.js";
    private final Bridge bridge;
    private final String injectedScript;

    BoltShareWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
        this.injectedScript = readBridgeScript();
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        Uri current = Uri.parse(url);
        if ("https".equalsIgnoreCase(current.getScheme()) && APP_HOST.equalsIgnoreCase(current.getHost()) && injectedScript != null) {
            view.evaluateJavascript(injectedScript, null);
        }
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        String scheme = uri.getScheme();
        if ("https".equalsIgnoreCase(scheme) && APP_HOST.equalsIgnoreCase(uri.getHost())) {
            return false;
        }
        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
            return launch(new Intent(Intent.ACTION_VIEW, uri));
        }
        if ("mailto".equalsIgnoreCase(scheme)) {
            return launch(new Intent(Intent.ACTION_SENDTO, uri));
        }
        if ("tel".equalsIgnoreCase(scheme)) {
            return launch(new Intent(Intent.ACTION_DIAL, uri));
        }
        return super.shouldOverrideUrlLoading(view, request);
    }

    private boolean launch(Intent intent) {
        try {
            bridge.getActivity().startActivity(intent);
        } catch (ActivityNotFoundException ignored) {
            return false;
        }
        return true;
    }

    private String readBridgeScript() {
        try (InputStream input = bridge.getContext().getAssets().open(BRIDGE_ASSET);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            String source = new String(output.toByteArray(), StandardCharsets.UTF_8);
            String encoded = Base64.encodeToString(source.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
            return "(function(){eval(atob('" + encoded + "'));})();";
        } catch (IOException error) {
            return null;
        }
    }
}
