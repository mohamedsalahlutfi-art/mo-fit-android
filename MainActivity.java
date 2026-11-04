package com.mofit.app;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.*;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
public class MainActivity extends Activity {
 private WebView web; private ValueCallback<Uri[]> fileCallback; private String pendingBackup;
 private static final int PICK_IMAGE=101, SAVE_BACKUP=102;
 @Override public void onCreate(Bundle state){super.onCreate(state);web=new WebView(this);setContentView(web);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(true);s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);web.addJavascriptInterface(new BackupBridge(),"AndroidBackup");web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){return !"file".equalsIgnoreCase(request.getUrl().getScheme());}});web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> callback,FileChooserParams params){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;try{Intent i=new Intent(Intent.ACTION_GET_CONTENT);i.setType(params.getAcceptTypes().length>0&&params.getAcceptTypes()[0].contains("json")?"application/json":"image/*");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(Intent.createChooser(i,"اختر ملفًا"),PICK_IMAGE);return true;}catch(Exception e){fileCallback=null;return false;}}});web.loadUrl("file:///android_asset/index.html");}
 public class BackupBridge {@JavascriptInterface public void exportJson(String data){pendingBackup=data;runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,"MO-FIT-backup.json");startActivityForResult(i,SAVE_BACKUP);});}}
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==PICK_IMAGE){if(fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);fileCallback=null;}}else if(request==SAVE_BACKUP&&result==RESULT_OK&&data!=null&&pendingBackup!=null){try(OutputStream o=getContentResolver().openOutputStream(data.getData())){if(o!=null)o.write(pendingBackup.getBytes(StandardCharsets.UTF_8));}catch(Exception e){android.widget.Toast.makeText(this,"فشل حفظ النسخة",android.widget.Toast.LENGTH_LONG).show();}pendingBackup=null;}}
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}
