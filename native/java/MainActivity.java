package be.brun.rituel;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private int lastKb = -1;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridge.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getBridge() == null) return;
        final WebView wv = getBridge().getWebView();
        if (wv == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(wv, (v, insets) -> {
            int ime = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;
            int kb = Math.round(ime / getResources().getDisplayMetrics().density);
            if (kb != lastKb) {
                lastKb = kb;
                wv.post(() -> wv.evaluateJavascript("window.__kb&&window.__kb(" + kb + ")", null));
            }
            return ViewCompat.onApplyWindowInsets(v, insets);
        });
        ViewCompat.requestApplyInsets(wv);
    }
}
