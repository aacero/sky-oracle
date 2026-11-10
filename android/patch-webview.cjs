const fs = require("fs");
const path = require("path");

const twaManifest = require("./twa-manifest.json");
const pkgId = twaManifest.packageId;
const host = twaManifest.host;
const startUrl = twaManifest.startUrl || "/";

// 1. Update AndroidManifest.xml: permissions, non-translucent dark theme, configChanges, and remove deprecated bar color meta-data
const manifestPath = path.resolve(process.cwd(), "app/src/main/AndroidManifest.xml");
if (fs.existsSync(manifestPath)) {
  let xml = fs.readFileSync(manifestPath, "utf8");

  // Remove deprecated status and navigation bar color meta-data tags
  xml = xml.replace(/<meta-data\b[^>]*\/>/g, (tag) => {
    if (/STATUS_BAR_COLOR|NAVIGATION_BAR_COLOR|NAVIGATION_BAR_DIVIDER_COLOR/.test(tag)) {
      return "";
    }
    return tag;
  });

  // Ensure INTERNET and ACCESS_NETWORK_STATE permissions are present
  if (!xml.includes("android.permission.INTERNET")) {
    xml = xml.replace(
      "<application",
      '    <uses-permission android:name="android.permission.INTERNET" />\n    <application'
    );
  }
  if (!xml.includes("android.permission.ACCESS_NETWORK_STATE")) {
    xml = xml.replace(
      "<application",
      '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n    <application'
    );
  }

  // Use opaque NoActionBar theme and prevent WebView reload on orientation change
  xml = xml.replace(
    /android:theme="@style\/Theme\.LauncherActivity"/g,
    'android:theme="@android:style/Theme.DeviceDefault.NoActionBar" android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboardHidden|uiMode"'
  );

  fs.writeFileSync(manifestPath, xml);
  console.log("Updated AndroidManifest.xml for native in-process WebView activity.");
}

// 2. Replace LauncherActivity.java with in-process WebView host (100% foreground UsageStats attribution + offline asset fallback + native immersive fullscreen)
const pkgPath = pkgId.replace(/\./g, "/");
const launcherPath = path.resolve(process.cwd(), `app/src/main/java/${pkgPath}/LauncherActivity.java`);

const javaCode = `package ${pkgId};

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class LauncherActivity extends Activity {
    private static final String APP_HOST = "${host}";
    private static final String START_PATH = "${startUrl}";
    private static final String APP_URL = "https://" + APP_HOST + START_PATH;
    private static final int BG_COLOR = Color.parseColor("#0d1117");

    private FrameLayout rootLayout;
    private WebView webView;
    private volatile boolean useBundledAssets = false;
    private volatile boolean immersiveFullscreen = false;
    private WebChromeClient.CustomViewCallback customViewCallback;

    public class AndroidBridge {
        @JavascriptInterface
        public void setFullscreen(boolean enable) {
            runOnUiThread(() -> setImmersiveFullscreen(enable));
        }

        @JavascriptInterface
        public boolean isFullscreen() {
            return immersiveFullscreen;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().getDecorView().setBackgroundColor(BG_COLOR);

        rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(BG_COLOR);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(
                    0,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                );
            }
            rootLayout.setOnApplyWindowInsetsListener((v, insets) -> {
                if (immersiveFullscreen) {
                    Insets cutout = insets.getInsets(WindowInsets.Type.displayCutout());
                    v.setPadding(cutout.left, cutout.top, cutout.right, cutout.bottom);
                } else {
                    Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()
                    );
                    v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                }
                return WindowInsets.CONSUMED;
            });
        }

        useBundledAssets = !isNetworkAvailable();

        webView = new WebView(this);
        webView.setBackgroundColor(BG_COLOR);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);

        webView.addJavascriptInterface(new AndroidBridge(), "SkyOracleAndroid");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(
                String origin,
                GeolocationPermissions.Callback callback
            ) {
                // Immediately trigger the app fast IP geolocation fallback without hanging
                callback.invoke(origin, false, false);
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customViewCallback != null) {
                    customViewCallback.onCustomViewHidden();
                }
                customViewCallback = callback;
                setImmersiveFullscreen(true);
            }

            @Override
            public void onHideCustomView() {
                setImmersiveFullscreen(false);
                if (customViewCallback != null) {
                    customViewCallback.onCustomViewHidden();
                    customViewCallback = null;
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(
                WebView view,
                WebResourceRequest request
            ) {
                Uri uri = request.getUrl();
                if (uri != null && APP_HOST.equals(uri.getHost())) {
                    String path = uri.getPath();
                    if (path != null && path.startsWith(START_PATH)) {
                        if (useBundledAssets || !isNetworkAvailable()) {
                            WebResourceResponse bundled = loadFromBundledAssets(path);
                            if (bundled != null) {
                                return bundled;
                            }
                        }
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onReceivedError(
                WebView view,
                WebResourceRequest request,
                WebResourceError error
            ) {
                if (request != null && request.isForMainFrame() && !useBundledAssets) {
                    useBundledAssets = true;
                    view.post(() -> view.loadUrl(APP_URL));
                    return;
                }
                super.onReceivedError(view, request, error);
            }

            @Override
            public boolean shouldOverrideUrlLoading(
                WebView view,
                WebResourceRequest request
            ) {
                Uri uri = request.getUrl();
                if (uri == null) return false;
                if (APP_HOST.equals(uri.getHost())) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        rootLayout.addView(
            webView,
            new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );
        setContentView(rootLayout);

        webView.loadUrl(APP_URL);
    }

    private void setImmersiveFullscreen(boolean enable) {
        immersiveFullscreen = enable;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                if (enable) {
                    controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    );
                    controller.hide(WindowInsets.Type.systemBars());
                } else {
                    controller.show(WindowInsets.Type.systemBars());
                }
            }
            if (rootLayout != null) {
                rootLayout.requestApplyInsets();
            }
        } else {
            View decorView = getWindow().getDecorView();
            if (enable) {
                decorView.setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                );
            } else {
                decorView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
            }
        }
    }

    private boolean isNetworkAvailable() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            Network active = cm.getActiveNetwork();
            if (active == null) return false;
            NetworkCapabilities caps = cm.getNetworkCapabilities(active);
            return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } catch (Exception e) {
            return false;
        }
    }

    private WebResourceResponse loadFromBundledAssets(String urlPath) {
        String relPath = urlPath.substring(START_PATH.length());
        while (relPath.startsWith("/")) {
            relPath = relPath.substring(1);
        }
        if (relPath.isEmpty()) {
            relPath = "index.html";
        }
        String assetPath = "webapp/" + relPath;
        try {
            InputStream stream = getAssets().open(assetPath);
            String mimeType = getMimeType(relPath);
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, stream);
        } catch (IOException e) {
            return null;
        }
    }

    private String getMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                "(function(){" +
                "var b=document.querySelector('#btnClosePlanetModal,#btnCloseSearch,#btnCloseTourModal');" +
                "if(b){b.click();return 'closed';}" +
                "return 'none';" +
                "})()",
                result -> {
                    if (result != null && result.contains("closed")) {
                        return;
                    }
                    if (immersiveFullscreen) {
                        setImmersiveFullscreen(false);
                        webView.evaluateJavascript(
                            "if(document.fullscreenElement){document.exitFullscreen();}else if(document.getElementById('btnToggleFullscreen')){document.getElementById('btnToggleFullscreen').click();}",
                            null
                        );
                        return;
                    }
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        finish();
                    }
                }
            );
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
`;

fs.writeFileSync(launcherPath, javaCode);
console.log("Generated native in-process WebView LauncherActivity.java");
