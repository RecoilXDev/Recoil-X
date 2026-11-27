package net.recoilx.preview;
import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.net.Uri;
import android.view.View;
import android.webkit.*;
public final class GameActivity extends Activity {
 private WebView web; private Uri origin;
 private int port(Uri u){return u.getPort()!=-1?u.getPort():"https".equals(u.getScheme())?443:80;}
 private boolean allowed(Uri u){return u!=null&&origin.getScheme().equals(u.getScheme())&&origin.getHost().equalsIgnoreCase(u.getHost()==null?"":u.getHost())&&port(origin)==port(u);}
 @Override public void onCreate(Bundle state){super.onCreate(state);origin=Uri.parse(BuildConfig.GAME_URL);
  if(!"https".equals(origin.getScheme())&&!(BuildConfig.DEBUG&&"10.0.2.2".equals(origin.getHost()))){new AlertDialog.Builder(this).setMessage("A secure preview server is required.").setPositiveButton("Close",(d,w)->finish()).show();return;}
  web=new WebView(this);setContentView(web);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setSupportMultipleWindows(false);s.setJavaScriptCanOpenWindowsAutomatically(false);s.setMediaPlaybackRequiresUserGesture(true);
  CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);WebView.setWebContentsDebuggingEnabled(false);
  web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){return !allowed(request.getUrl());}@Override public boolean shouldOverrideUrlLoading(WebView v,String url){return !allowed(Uri.parse(url));}
   @Override public void onReceivedError(WebView v,WebResourceRequest req,WebResourceError error){if(req.isForMainFrame())new AlertDialog.Builder(GameActivity.this).setMessage("Could not reach the preview server. Start the development server or configure an HTTPS preview origin.").setPositiveButton("Retry",(d,w)->web.loadUrl(origin.toString())).setNegativeButton("Exit",(d,w)->finish()).show();}
  });
  web.setWebChromeClient(new WebChromeClient(){@Override public void onPermissionRequest(PermissionRequest request){request.deny();}});hideBars();web.loadUrl(origin.toString());
 }
 private void hideBars(){getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);}
 @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)hideBars();}
 @Override protected void onPause(){super.onPause();if(web!=null)web.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override protected void onDestroy(){if(web!=null){web.stopLoading();web.destroy();web=null;}super.onDestroy();}
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else new AlertDialog.Builder(this).setMessage("Exit RECOIL X?").setPositiveButton("Exit",(d,w)->finish()).setNegativeButton("Cancel",null).show();}
}
