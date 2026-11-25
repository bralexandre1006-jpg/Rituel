package be.brun.rituel;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class WidgetSync extends JobService {
    static final int JOB = 4242;
    private WebView wv;
    private JobParameters params;
    private final Handler h = new Handler(Looper.getMainLooper());

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("rituel_bg", Context.MODE_PRIVATE); }

    static void schedule(Context c) {
        JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null || js.getPendingJob(JOB) != null) return;
        js.schedule(new JobInfo.Builder(JOB, new ComponentName(c, WidgetSync.class))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
            .setPeriodic(15 * 60 * 1000L)
            .setPersisted(false)
            .build());
    }

    @Override
    public boolean onStartJob(JobParameters p) {
        if (RituelWidget.ids(this).length == 0 || prefs(this).getString("state", null) == null) return false;
        params = p;
        try {
            wv = new WebView(getApplicationContext());
            WebSettings s = wv.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            s.setAllowFileAccess(true);
            wv.addJavascriptInterface(new Bg(), "RWBG");
            wv.resumeTimers();
            wv.loadUrl("file:///android_asset/public/index.html");
            h.postDelayed(this::finish, 40000);
        } catch (Exception e) { return false; }
        return true;
    }

    private void finish() {
        h.removeCallbacksAndMessages(null);
        if (wv != null) { wv.destroy(); wv = null; }
        if (params != null) { jobFinished(params, false); params = null; }
    }

    @Override
    public boolean onStopJob(JobParameters p) { params = null; finish(); return false; }

    class Bg {
        @JavascriptInterface public String state() { return prefs(WidgetSync.this).getString("state", ""); }
        @JavascriptInterface public String remote(String url) {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(15000); c.setReadTimeout(15000);
                if (c.getResponseCode() != 200) return "";
                InputStream in = c.getInputStream();
                ByteArrayOutputStream b = new ByteArrayOutputStream();
                byte[] buf = new byte[8192]; int n;
                while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
                in.close();
                return b.toString("UTF-8");
            } catch (Exception e) { return ""; }
        }
        @JavascriptInterface public void png(String data) {
            try {
                int i = data.indexOf(',');
                byte[] bytes = Base64.decode(i >= 0 ? data.substring(i + 1) : data, Base64.DEFAULT);
                File tmp = new File(getFilesDir(), "widget.tmp");
                FileOutputStream out = new FileOutputStream(tmp);
                out.write(bytes); out.close();
                if (tmp.renameTo(new File(getFilesDir(), "widget.png"))) RituelWidget.refreshAll(WidgetSync.this);
            } catch (Exception e) {}
        }
        @JavascriptInterface public void done() { h.post(WidgetSync.this::finish); }
    }
}
