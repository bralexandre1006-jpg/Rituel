package be.brun.rituel;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "RituelWidget")
public class WidgetBridge extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("png");
        if (data == null) { call.reject("png manquant"); return; }
        try {
            int i = data.indexOf(',');
            if (i >= 0) data = data.substring(i + 1);
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            Context c = getContext();
            File tmp = new File(c.getFilesDir(), "widget.tmp");
            FileOutputStream out = new FileOutputStream(tmp);
            out.write(bytes);
            out.close();
            File img = new File(c.getFilesDir(), "widget.png");
            if (!tmp.renameTo(img)) { call.reject("écriture impossible"); return; }
            RituelWidget.refreshAll(c);
            JSObject r = new JSObject();
            r.put("count", RituelWidget.ids(c).length);
            call.resolve(r);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void info(PluginCall call) {
        Context c = getContext();
        JSObject r = new JSObject();
        r.put("count", RituelWidget.ids(c).length);
        r.put("canPin", Build.VERSION.SDK_INT >= 26 && AppWidgetManager.getInstance(c).isRequestPinAppWidgetSupported());
        call.resolve(r);
    }

    @PluginMethod
    public void pin(PluginCall call) {
        Context c = getContext();
        if (Build.VERSION.SDK_INT < 26) { call.reject("unsupported"); return; }
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        if (!m.isRequestPinAppWidgetSupported()) { call.reject("unsupported"); return; }
        m.requestPinAppWidget(new ComponentName(c, RituelWidget.class), null, null);
        call.resolve();
    }

    private static final int LIVE_ID = 424242;
    private static final String LIVE_CH = "rituel_live";

    @PluginMethod
    public void liveStart(PluginCall call) {
        try {
            Context c = getContext();
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(LIVE_CH) == null) {
                NotificationChannel ch = new NotificationChannel(LIVE_CH, "Routine en cours", NotificationManager.IMPORTANCE_DEFAULT);
                ch.setSound(null, null);
                ch.enableVibration(false);
                ch.setShowBadge(false);
                nm.createNotificationChannel(ch);
            }
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, LIVE_CH) : new Notification.Builder(c);
            int icon = c.getResources().getIdentifier("ic_stat_rituel", "drawable", c.getPackageName());
            if (icon == 0) icon = c.getApplicationInfo().icon;
            b.setSmallIcon(icon)
                .setContentTitle(call.getString("title", "Routine"))
                .setContentText(call.getString("text", ""))
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_PROGRESS);
            Double end = call.getDouble("end");
            if (end != null) {
                b.setWhen(end.longValue()).setShowWhen(true).setUsesChronometer(true);
                if (Build.VERSION.SDK_INT >= 24) b.setChronometerCountDown(true);
            }
            Integer step = call.getInt("step"), total = call.getInt("total");
            if (step != null && total != null && total > 0) b.setProgress(total, step, false);
            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            if (open != null) {
                open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                b.setContentIntent(PendingIntent.getActivity(c, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            Bundle ex = new Bundle();
            ex.putBoolean("android.requestPromotedOngoing", true);
            b.addExtras(ex);
            nm.notify(LIVE_ID, b.build());
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void liveStop(PluginCall call) {
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        nm.cancel(LIVE_ID);
        call.resolve();
    }
}
