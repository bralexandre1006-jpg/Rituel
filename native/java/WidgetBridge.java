package be.brun.rituel;

import android.appwidget.AppWidgetManager;
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
        int[] ids = RituelWidget.ids(c);
        r.put("count", ids.length);
        if (ids.length > 0) {
            android.os.Bundle b = AppWidgetManager.getInstance(c).getAppWidgetOptions(ids[0]);
            r.put("w", b.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH));
            r.put("h", b.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT));
        }
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
}
