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
  await page.addInitScript(()=>{localStorage.setItem('zone90v2_rx-home-layout-v2','"compact"');});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#overlay.b-device-active #choosePC').waitFor({state:'visible'});
  const photo=await page.locator('#overlay').evaluate(e=>getComputedStyle(e).backgroundImage);assert.match(photo,/b-coastal-reference\.webp/,'actual device background');
  assert.equal(await page.locator('meta[name="rx-ui-revision"]').getAttribute('content'),'B-UI-STABLE-3');
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
  assert.deepEqual(errors,[],'uncaught browser errors');
  await context.close();console.log('PASS '+(tv?'Samsung TV user-agent':'desktop')+' device screen, lobby, navigation, weapon previews and box menu');
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}