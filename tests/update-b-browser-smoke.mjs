import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {createRecoilServer} from '../server/server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RX_PLAYWRIGHT_MODULE||'playwright-core');
const server=createRecoilServer({database:':memory:'});server.listen(0,'127.0.0.1');await once(server,'listening');
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const url='http://127.0.0.1:'+server.address().port;
 for(const tv of [false,true]){
  const context=await browser.newContext({viewport:{width:tv?1280:1440,height:tv?720:900},serviceWorkers:'block',...(tv?{userAgent:'Mozilla/5.0 (SMART-TV; Linux; Tizen 9.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/8.0 Chrome/120.0.6099.5 TV Safari/537.36'}:{})});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{localStorage.setItem('zone90v2_rx-home-layout-v2','"compact"');localStorage.setItem('zone90v2_z1Progress',JSON.stringify({xp:50000,kills:0}));});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#overlay.b-device-active #choosePC').waitFor({state:'visible'});
  const photo=await page.locator('#overlay').evaluate(e=>getComputedStyle(e).backgroundImage);assert.match(photo,/b-theme-aero\.svg/,'native scalable device background');
  const dimensions=await page.locator('#overlay').evaluate(async el=>{const bg=getComputedStyle(el).backgroundImage;const src=bg.match(/url\("?([^\")]+)"?\)/)[1];const art=new Image();art.src=src;await art.decode();return [art.naturalWidth,art.naturalHeight];});assert.deepEqual(dimensions,[1920,1080]);
  const size=await page.evaluate(async()=>{const image=new Image();image.src='server/b-coastal-hd.avif';await image.decode();return [image.naturalWidth,image.naturalHeight];});assert.deepEqual(size,[796,366]);
  assert.equal(await page.locator('meta[name="rx-ui-revision"]').getAttribute('content'),'B-UI-STABLE-5');
  await page.locator('#choosePC').click();
  await page.locator('#bLobby[data-theme=aero]').waitFor({state:'visible'});
  assert.equal(await page.locator('#mainMenu').evaluate(e=>e.classList.contains('rx-simple-active')),false);
  await page.locator('#bLobby [data-b-action=collection]').click();
  await page.locator('#z1CollectionMenu').waitFor({state:'visible'});
  await page.locator('#v8GunBtn').click();
  await page.locator('#v8GunMenu').waitFor({state:'visible'});
  const previews=page.locator('#v8GunCollection img.b-mesh-preview');
  await previews.first().waitFor({state:'visible'});
  assert.ok(await previews.count()>0,'real mesh projections in collection');
  await previews.first().evaluate(img=>img.decode());
  assert.ok(await previews.first().evaluate(img=>img.naturalWidth>0));
  await page.locator('#v8GunBack').click();
  await page.locator('#bLobby [data-b-action=collection]').click();
  await page.locator('#crateBtn').click();
  await page.locator('#crateGrid .crate-card').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#crateGrid .crate-card').count(),10);
  assert.ok((await page.locator('#crateGrid .crate-card').first().evaluate(e=>getComputedStyle(e).backgroundImage)).includes('gradient'));
  await page.locator('#crateBackBtn').click();
  const themes=['aero','sand','zone90','metro','midnight','aurora','cyber','golden'],backgrounds=new Set(),palettes=new Set();
  for(const id of themes){
   await page.locator('#bLobby [data-b-action=themes]').click();
   const card=page.locator('#bThemeGrid [data-theme-id="'+id+'"]');
   await card.waitFor({state:'visible'});
   const select=card.locator('button');
   if(await select.isEnabled())await select.click();
   assert.equal(await card.getAttribute('data-active'),'true','active '+id);
   assert.equal(await page.locator('body').getAttribute('data-b-theme'),id);
   await page.locator('#bThemesMenu .z1-back').click();
   await page.locator('#bLobby[data-theme="'+id+'"]').waitFor({state:'visible'});
   const view=await page.locator('#bLobby').evaluate(el=>({bg:getComputedStyle(el).backgroundImage,panel:getComputedStyle(document.body).getPropertyValue('--b-menu-panel').trim(),width:el.clientWidth,scroll:el.scrollWidth}));
   assert.ok(view.bg.includes('b-theme-'+id+'.svg'));backgrounds.add(view.bg);palettes.add(view.panel);assert.ok(view.scroll<=view.width+2,'no horizontal clipping in '+id);
   await page.locator('#bLobby [data-b-action=collection]').click();
   const panel=await page.locator('#overlay .panel').evaluate(el=>getComputedStyle(el).backgroundImage);assert.match(panel,/gradient/);
   await page.locator('#z1CollectionMenu .z1-back').click();
  }
  assert.equal(backgrounds.size,8,'distinct backgrounds');assert.equal(palettes.size,8,'distinct palettes');
  assert.deepEqual(errors,[],'uncaught browser errors');
  await context.close();console.log('PASS '+(tv?'Samsung TV user-agent':'desktop')+' device screen, lobby, navigation, weapon previews and box menu');
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}