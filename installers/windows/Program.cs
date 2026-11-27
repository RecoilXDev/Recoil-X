using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
namespace RecoilX;
internal static class Program {
 [STAThread] static void Main(){ApplicationConfiguration.Initialize();Application.Run(new GameWindow());}
}
sealed class GameWindow:Form {
 readonly WebView2 view=new(){Dock=DockStyle.Fill};
 Uri origin=new("http://127.0.0.1:8787/");
 static bool Valid(Uri u)=>u.IsAbsoluteUri&&string.IsNullOrEmpty(u.UserInfo)&&string.IsNullOrEmpty(u.Query)&&string.IsNullOrEmpty(u.Fragment)&&u.AbsolutePath=="/"&&(u.Scheme=="https"||u.Scheme=="http"&&u.IsLoopback);
 bool SameOrigin(string url)=>Uri.TryCreate(url,UriKind.Absolute,out var u)&&u.Scheme==origin.Scheme&&u.IdnHost==origin.IdnHost&&u.Port==origin.Port;
 public GameWindow(){Text="RECOIL X — Update B Preview";Width=1280;Height=800;MinimumSize=new Size(640,360);StartPosition=FormStartPosition.CenterScreen;Controls.Add(view);Shown+=async(_,_)=>await Initialize();KeyPreview=true;KeyDown+=(_,e)=>{if(e.KeyCode==Keys.F11){if(FormBorderStyle==FormBorderStyle.None){FormBorderStyle=FormBorderStyle.Sizable;WindowState=FormWindowState.Normal;}else{FormBorderStyle=FormBorderStyle.None;WindowState=FormWindowState.Maximized;}e.Handled=true;}};}
 async Task Initialize(){try{
  var configured=Environment.GetEnvironmentVariable("RX_GAME_URL");
  if(!string.IsNullOrWhiteSpace(configured)){if(!Uri.TryCreate(configured,UriKind.Absolute,out var u)||!Valid(u))throw new InvalidOperationException("Use a trusted HTTPS origin or loopback server.");origin=u;}
  var dir=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"RecoilX","PreviewWebView");
  var env=await CoreWebView2Environment.CreateAsync(userDataFolder:dir);await view.EnsureCoreWebView2Async(env);
  var web=view.CoreWebView2;web.Settings.AreDevToolsEnabled=false;web.Settings.AreHostObjectsAllowed=false;web.Settings.IsStatusBarEnabled=false;
  web.NavigationStarting+=(_,e)=>{if(!SameOrigin(e.Uri))e.Cancel=true;};web.NewWindowRequested+=(_,e)=>{e.Handled=true;};
  web.PermissionRequested+=(_,e)=>{e.State=CoreWebView2PermissionState.Deny;};web.DownloadStarting+=(_,e)=>{e.Cancel=true;};
  web.NavigationCompleted+=(_,e)=>{Text=e.IsSuccess?"RECOIL X — Update B Preview":"RECOIL X — could not reach preview server";};
  web.Navigate(origin.AbsoluteUri);
 }catch(Exception ex){MessageBox.Show("Install the Microsoft Edge WebView2 Runtime and start the preview server.\n"+ex.Message,"RECOIL X",MessageBoxButtons.OK,MessageBoxIcon.Warning);Close();}}
}