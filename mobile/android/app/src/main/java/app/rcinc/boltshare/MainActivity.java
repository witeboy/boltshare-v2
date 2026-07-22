package app.rcinc.boltshare;

import android.os.Bundle;
import android.content.pm.ApplicationInfo;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private BoltShareAdsManager adsManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);
        registerPlugin(BoltShareNativePlugin.class);
        super.onCreate(savedInstanceState);
        adsManager = new BoltShareAdsManager(this, bridge.getWebView());
    }

    BoltShareAdsManager getAdsManager() {
        return adsManager;
    }

    @Override
    public void onResume() {
        super.onResume();
        if (adsManager != null) adsManager.onResume();
    }

    @Override
    public void onPause() {
        if (adsManager != null) adsManager.onPause();
        super.onPause();
    }

    @Override
    public void onDestroy() {
        if (adsManager != null) adsManager.destroy();
        super.onDestroy();
    }
}
