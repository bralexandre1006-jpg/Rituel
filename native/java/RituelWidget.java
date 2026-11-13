package be.brun.rituel;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import java.io.File;

public class RituelWidget extends AppWidgetProvider {

    static int[] ids(Context c) {
        return AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c, RituelWidget.class));
    }

    static void refreshAll(Context c) {
        int[] a = ids(c);
        if (a.length > 0) render(c, AppWidgetManager.getInstance(c), a);
    }

    static void render(Context c, AppWidgetManager m, int[] a) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.rituel_widget);
        File img = new File(c.getFilesDir(), "widget.png");
        if (img.exists()) {
            v.setImageViewUri(R.id.widget_img, Uri.parse("content://" + c.getPackageName() + ".widgetimg/widget.png?t=" + img.lastModified()));
            v.setViewVisibility(R.id.widget_empty, View.GONE);
        }
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (open != null) {
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            v.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        m.updateAppWidget(a, v);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) {
        render(c, m, new int[]{id});
    }

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] a) {
        render(c, m, a);
    }
}
