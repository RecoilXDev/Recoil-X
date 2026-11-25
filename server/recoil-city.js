// Standalone city session. Driving and walking share the same world and camera.
(() => {
  'use strict';
  if (window.RecoilCity) return;
  const careerKey = 'recoil-x.city.career.v1';
  let dialog, controls, world, frame, previousTime, nextHud, nextDraw, frameInterval, previousFocus;
  let lastCareer, lastNotice, paused = false;
  let options, yaw=0, tilt=0, manualUntil=0, lookPointer=null, firing=false, queuedShot=false, cam=null;
  const prefsKey='recoil-x.city.view.v1';
  let online=null,onlinePending=false,onlineConnectBusy=false,onlineEpoch=0,onlineNext=0,onlineNote='Offline';
  const remoteTargets=new Map();
  const held = new Set(), pointers = new Map();
  const arrowCodes = {KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'brake',ShiftLeft:'sprint',ShiftRight:'sprint',KeyF:'fire',KeyZ:'lookLeft',KeyX:'lookRight',PageUp:'lookUp',PageDown:'lookDown'};
  const style = document.createElement('style');
  style.textContent = `
    #recoil-city{--ink:#18221e;--glass:#15211df1;--paper:#fff4db;--gold:#ffcd68;--muted:#cfdbce;position:fixed;inset:0;margin:0;padding:0;width:100%;height:100%;max-width:100%;max-height:100%;border:0;background:#496050;color:var(--paper);font:500 14px/1.35 Barlow,Arial,sans-serif;overflow:hidden;isolation:isolate;touch-action:none;user-select:none;color-scheme:dark;z-index:2147483600}
    #recoil-city:not([open]),#recoil-city [hidden]{display:none!important}
    #recoil-city::backdrop{background:#121c18}#recoil-city *{box-sizing:border-box}#recoil-city canvas{display:block}
    #recoil-city .rc-streets{position:absolute;inset:0;width:100%;height:100%;outline:none}
    #recoil-city .rc-hud{position:absolute;inset:max(12px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));pointer-events:none}
    #recoil-city .rc-panel{background:var(--glass);border:1px solid #a8bd9e77;border-radius:8px;box-shadow:0 2px 9px #0004}
    #recoil-city .rc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
    #recoil-city .rc-place{padding:9px 15px 10px;border-left:4px solid var(--gold);max-width:65vw}
    #recoil-city h2,#recoil-city h3,#recoil-city p{margin:0;padding:0;text-shadow:none}
    #recoil-city h2{color:var(--paper);font:bold clamp(19px,3vw,30px)/1 'Barlow Condensed',Arial,sans-serif;text-transform:uppercase;letter-spacing:.035em}
    #recoil-city .rc-area{display:block;margin-top:4px;color:var(--muted);font-size:12px}
    #recoil-city .rc-menu{display:flex;align-items:center;gap:6px}
    #recoil-city button{pointer-events:auto;appearance:none;min-width:44px;min-height:44px;height:auto;border:1px solid #93a58f;border-radius:6px;background:var(--glass);color:var(--paper);font:700 14px/1.2 Barlow,Arial,sans-serif;text-transform:none;padding:8px 12px;letter-spacing:0;box-shadow:none;cursor:pointer;touch-action:manipulation}
    #recoil-city button:hover{background:#344b3e}#recoil-city button:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
    #recoil-city button[data-primary]{background:var(--gold);color:#211d13;border-color:#f8da99}#recoil-city button:disabled{opacity:.55;cursor:default}
    #recoil-city .rc-bottom{position:absolute;inset:auto 0 0;display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
    #recoil-city .rc-nav{width:190px;max-width:34%;overflow:hidden}#recoil-city .rc-map{width:100%;height:auto;aspect-ratio:5/3}
    #recoil-city .rc-trip{display:flex;justify-content:space-between;gap:7px;padding:6px 9px;color:var(--paper);font:700 12px/1.15 'Barlow Condensed',Arial,sans-serif}
    #recoil-city .rc-trip .rc-cash{color:var(--gold)}#recoil-city .rc-job{max-width:min(340px,60%);padding:11px 13px}
    #recoil-city .rc-jobhead{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:4px}
    #recoil-city .rc-jobtitle{font-size:14px;font-weight:750;color:var(--gold)}#recoil-city .rc-heat{font-size:12px;color:var(--muted);white-space:nowrap}#recoil-city .rc-heat[data-hot]{color:#ffaf8c}
    #recoil-city .rc-objective{color:var(--paper);font-size:14px;min-height:1.4em}#recoil-city .rc-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    #recoil-city .rc-actions button{font-size:13px;padding:7px 10px}#recoil-city kbd{font:inherit;color:inherit;opacity:.76;margin-left:5px}
    #recoil-city .rc-notice{position:absolute;top:15%;left:50%;transform:translateX(-50%);max-width:min(420px,90%);margin:0;text-align:center;color:var(--paper);background:var(--glass);border-radius:6px;padding:6px 12px;font-weight:650}#recoil-city .rc-notice:empty{display:none}
    #recoil-city .rc-pad{display:none}
    #recoil-city .rc-help{position:absolute;inset:0;z-index:4;display:grid;align-content:center;justify-items:center;background:#0d1716c9;pointer-events:auto;padding:14px;touch-action:pan-y}
    #recoil-city .rc-sheet{width:min(390px,100%);padding:20px;max-height:100%;overflow:auto}
    #recoil-city .rc-a1-hub{display:grid;gap:7px;margin:12px 0;padding:10px;border:1px solid #93a58f;border-radius:8px}#recoil-city .rc-a1-hub button{min-height:36px}#recoil-city .rc-a1-hub h3{font-size:18px;margin-top:8px}
    #recoil-city .rc-sheet h3{font-size:23px;line-height:1.2;color:var(--paper)}#recoil-city .rc-sheet dl{margin:12px 0;display:grid;grid-template-columns:auto 1fr;gap:7px 15px}
    #recoil-city .rc-sheet dt{color:var(--gold);font-weight:700}#recoil-city .rc-sheet dd{margin:0}
    #recoil-city .rc-sheet p{margin:10px 0;color:var(--muted)}#recoil-city .rc-sheet button{margin-top:4px}
    @media(pointer:coarse),(max-width:740px){
      #recoil-city .rc-hud{inset:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))}
      #recoil-city .rc-pad{display:grid;position:absolute;left:0;bottom:0;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,44px);gap:3px}
      #recoil-city .rc-pad button{padding:0;font-size:21px;touch-action:none;background:#16251fe0}
      #recoil-city .rc-pad button[data-held]{background:#ffcd68;color:#18221e}
      #recoil-city .rc-pad button::before{content:"";display:inline-block;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:11px solid currentColor}
      #recoil-city .rc-left::before{transform:rotate(-90deg)}#recoil-city .rc-right::before{transform:rotate(90deg)}#recoil-city .rc-down::before{transform:rotate(180deg)}
      #recoil-city .rc-up{grid-area:1/2}#recoil-city .rc-left{grid-area:2/1}#recoil-city .rc-down{grid-area:2/2}#recoil-city .rc-right{grid-area:2/3}
      #recoil-city .rc-nav{position:absolute;right:0;top:53px;width:108px;max-width:none}
      #recoil-city .rc-bottom{display:contents}#recoil-city .rc-job{position:absolute;right:0;bottom:0;width:min(310px,calc(100% - 147px));max-width:none;padding:8px}
      #recoil-city .rc-actions{gap:4px;margin-top:5px}#recoil-city .rc-actions button{font-size:12px;padding:4px 6px}
      #recoil-city .rc-place{padding:7px 10px}#recoil-city .rc-head h2{font-size:20px}
      #recoil-city .rc-area,#recoil-city .rc-trip,#recoil-city .rc-heat{font-size:11px}#recoil-city .rc-jobtitle,#recoil-city .rc-objective{font-size:12px}
      #recoil-city .rc-trip{padding:4px;flex-wrap:wrap;gap:2px}#recoil-city kbd{display:none}
      #recoil-city .rc-notice{top:24%;max-width:65%}
    }
    #recoil-city .rc-sky{position:absolute;inset:0;width:100%;height:100%}
    #recoil-city .rc-streets{touch-action:none;cursor:crosshair}
    #recoil-city .rc-reticle{position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2.5px;background:#fff5dc;border-radius:50%;box-shadow:0 0 0 1px #1e3232,0 1px 4px #2228;pointer-events:none}
    #recoil-city .rc-reticle.hit{background:#ffc05e;outline:2px solid #a95835}
    #recoil-city .rc-loadout{display:block;padding:0 9px 7px;font-size:11px;color:var(--muted)}
    #recoil-city .rc-sheet{width:min(500px,100%);text-align:start}
    #recoil-city .rc-settings-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0}
    #recoil-city .rc-settings-row select{min-width:44%;padding:7px;border:1px solid #849885;border-radius:5px;background:#273a31;color:var(--paper);font:inherit}
    #recoil-city .rc-sheet details{margin:12px 0}
    #recoil-city .rc-skills{display:none}
    @media(pointer:coarse),(max-width:740px){
      #recoil-city .rc-skills{position:absolute;left:0;bottom:96px;display:grid;grid-template-columns:repeat(2,minmax(44px,1fr));gap:3px;max-width:136px}
      #recoil-city .rc-skills button{font-size:12px;padding:4px;touch-action:none}
      #recoil-city .rc-loadout{font-size:10px;padding:0 4px 4px}
      #recoil-city .rc-sheet{max-height:calc(100dvh - 22px)}
    }
    @media(max-width:450px){#recoil-city .rc-menu button{font-size:12px;padding:6px 8px}#recoil-city .rc-jobhead{gap:4px}#recoil-city .rc-nav{width:98px}}
    @media(max-height:420px){#recoil-city .rc-place{padding:4px 8px}#recoil-city .rc-nav{width:96px}}
  `;
  document.head.append(style);
  function mount() {
    dialog = document.createElement('dialog');
    dialog.id = 'recoil-city';
    dialog.setAttribute('aria-labelledby','rc-title');
    dialog.innerHTML = `
      <canvas class="rc-sky" aria-hidden="true"></canvas><canvas class="rc-streets" tabindex="-1" aria-label="City streets. Use the map and dispatch directions to find your destination."></canvas>
      <div class="rc-hud"><i class="rc-reticle" aria-hidden="true"></i><div class="rc-head"><div class="rc-panel rc-place"><h2 id="rc-title">Recoil City · A.1</h2><span class="rc-area"></span></div>
        <div class="rc-menu"><button type="button" data-click="cityhub">City Hub</button><button type="button" data-click="help">Settings</button><button type="button" data-click="exit">Exit city</button></div></div>
        <div class="rc-bottom"><div class="rc-panel rc-nav"><canvas class="rc-map" width="250" height="150" aria-label="City map, north at the top"></canvas>
          <div class="rc-trip"><span class="rc-speed"></span><span class="rc-cash"></span></div><span class="rc-loadout"></span></div>
          <div class="rc-panel rc-job"><div class="rc-jobhead"><span class="rc-jobtitle"></span><span class="rc-heat"></span></div>
          <p class="rc-objective"></p><div class="rc-actions"><button type="button" data-click="job" data-primary><span></span><kbd>J</kbd></button>
          <button type="button" data-click="vehicle"><span></span><kbd>E</kbd></button><button type="button" data-hold="brake" hidden>Brake</button>
          <button type="button" data-click="shop" hidden><span></span><kbd>B</kbd></button><button type="button" data-click="interior" hidden><span>Enter shop</span><kbd>T</kbd></button><button type="button" data-click="rob" hidden>Rob shop <kbd>H</kbd></button><button type="button" data-click="paint" hidden><span></span><kbd>G</kbd></button></div></div></div>
        <div class="rc-skills" aria-label="On-foot controls"><button data-click="jump">Jump</button><button data-hold="sprint">Sprint</button><button data-hold="fire">Fire</button><button data-click="weapon">Weapon</button></div>
        <div class="rc-pad" aria-label="Movement controls"><button type="button" class="rc-up" data-hold="up" aria-label="Up or accelerate"></button>
          <button type="button" class="rc-left" data-hold="left" aria-label="Left"></button><button type="button" class="rc-down" data-hold="down" aria-label="Down or reverse"></button>
          <button type="button" class="rc-right" data-hold="right" aria-label="Right"></button></div>
        <p class="rc-notice" role="status" aria-live="polite"></p><div class="rc-death" hidden style="position:absolute;inset:0;z-index:50;pointer-events:none;background:#100000aa;text-align:center;align-content:center;color:#ed3030;font:900 clamp(48px,15vw,140px) system-ui;letter-spacing:.08em;text-shadow:0 4px 12px #000" role="alert">DEAD</div>
      </div><div class="rc-help" hidden><section class="rc-panel rc-sheet" aria-labelledby="rc-guide-title"><h3 id="rc-guide-title">City settings</h3>
        <label class="rc-settings-row">Camera<select data-option="mode"><option value="third">Third person</option><option value="first">First person</option></select></label>
        <label class="rc-settings-row">Graphics<select data-option="quality"><option value="low">Low</option><option value="standard">Standard</option><option value="high">High</option></select></label>
        <div class="rc-radio-slot"></div><section class="rc-a1-hub" hidden></section>
        <details><summary>City controls</summary><dl><dt>Move</dt><dd>WASD, arrow keys, or the direction pad. Shift to sprint. Space to jump or brake.</dd>
        <dt>Look</dt><dd>Drag with the right mouse button or swipe the street. Z/X to turn, Page Up/Down to look vertically. C centers the camera. V switches view.</dd>
        <dt>Combat</dt><dd>Click or hold F to fire. Q or 1–4 to change weapon. R reloads. On touch, use Fire and Weapon. An empty magazine reloads automatically.</dd>
        <dt>E</dt><dd>Enter or take a nearby vehicle. Slow down to exit.</dd><dt>J</dt><dd>Accept, collect, or deliver the current city job.</dd>
        <dt>Shops</dt><dd>G repaints your Vista at Sandline Customs. B buys a meal or repairs a car. T enters/exits a shop on foot; H triggers a fictional robbery inside.</dd>
        <dt>Esc</dt><dd>Close settings or leave the city.</dd></dl></details><p class="rc-career"></p><button type="button" data-click="resume" data-primary>Resume</button></section></div>`;
    document.body.append(dialog);
    const find = selector => dialog.querySelector(selector);
    controls = {streets:find('.rc-streets'),map:find('.rc-map'),area:find('.rc-area'),speed:find('.rc-speed'),cash:find('.rc-cash'),jobTitle:find('.rc-jobtitle'),
      heat:find('.rc-heat'),objective:find('.rc-objective'),notice:find('.rc-notice'),job:find('[data-click="job"]'),vehicle:find('[data-click="vehicle"]'),
      brake:find('[data-hold="brake"]'),paint:find('[data-click="paint"]'),help:find('.rc-help'),career:find('.rc-career'),resume:find('[data-click="resume"]'),hud:find('.rc-hud')};
    controls.hub=find('.rc-a1-hub');controls.sky=find('.rc-sky');controls.reticle=find('.rc-reticle');controls.loadout=find('.rc-loadout');controls.skills=find('.rc-skills');controls.shop=find('[data-click="shop"]');controls.interior=find('[data-click="interior"]');controls.rob=find('[data-click="rob"]');controls.death=find('.rc-death');
    window.RecoilCityRadio?.mount(find('.rc-radio-slot'));
    dialog.addEventListener('change',e=>{const name=e.target.dataset.option;if(name){options[name]=e.target.value;applyOptions();}});
    controls.streets.addEventListener('contextmenu',e=>e.preventDefault());
    controls.streets.addEventListener('pointerdown',e=>{
      if(paused)return;
      controls.streets.focus({preventScroll:true});controls.streets.setPointerCapture(e.pointerId);
      if(e.pointerType==='mouse'&&e.button===0){firing=true;queuedShot=true;return;}
      lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};
    });
    controls.streets.addEventListener('pointermove',e=>{
      if(lookPointer?.id!==e.pointerId)return;
      const sensitivity=e.pointerType==='mouse'?.0065:.009;
      yaw+=(e.clientX-lookPointer.x)*sensitivity;tilt=Math.max(-.6,Math.min(.62,tilt-(e.clientY-lookPointer.y)*sensitivity));
      manualUntil=world.elapsed+1.4;lookPointer.x=e.clientX;lookPointer.y=e.clientY;
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (paused) setHelp(false); else close(); });
    dialog.addEventListener('click', event => {
      const action = event.target.closest('button')?.dataset.click;
      if (action === 'exit') close();
      if (action === 'help' || action === 'resume') {controls.hub.hidden=true;setHelp(action === 'help');}
      if(action==='cityhub'){setHelp(true);controls.hub.hidden=false;renderHub();}
      const b=event.target.closest('button');if(b?.dataset.cityAction&&world){if(b.dataset.cityAction.startsWith('online-'))void cityOnlineAction(b.dataset.cityAction);else{window.RecoilCityWorld.a1Action(world,b.dataset.cityAction,b.dataset.cityId);renderHub();saveCareer();}}
      if (['vehicle','job','paint','weapon','shop','jump','interior','rob'].includes(action)) act(action);
    });
    dialog.addEventListener('pointerdown', event => {
      const button = event.target.closest('[data-hold]');
      if (!button || paused) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId,button.dataset.hold);
      if(button.dataset.hold==='fire')queuedShot=true;
      button.setAttribute('data-held','');
    });
    function release(event) {
      if(event.pointerType==='mouse')firing=false;
      if(lookPointer?.id===event.pointerId)lookPointer=null;
      const name = pointers.get(event.pointerId);
      if (!name) return;
      pointers.delete(event.pointerId);
      if (![...pointers.values()].includes(name)) find('[data-hold="'+name+'"]').removeAttribute('data-held');
    }
    for (const type of ['pointerup','pointercancel','lostpointercapture']) dialog.addEventListener(type,release);
  }
  function setText(node,value) { if(node.textContent !== value) node.textContent=value; }
  function target() { return world.job ? (world.job.stage === 'pickup' ? world.job.pickup : world.job.dropoff) : window.RecoilCityWorld.raceView(world).active?.goal||window.RecoilCityWorld.a1View(world).story?.goal||null; }
  function streetRoute(map, start, end) {
    const distance=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
    const nearest=(coords,value)=>coords.reduce((best,c)=>Math.abs(c-value)<Math.abs(best-value)?c:best);
    function streets(point) {
      const x=nearest(map.roadsX,point.x), y=nearest(map.roadsY,point.y);
      const vertical={x,y:point.y,vertical:true}, horizontal={x:point.x,y,vertical:false};
      const radius=Math.max(map.roadWidth/2,Math.min(distance(point,vertical),distance(point,horizontal)));
      return [vertical,horizontal].filter(p=>distance(point,p)<=radius);
    }
    let shortest=Infinity, route=[];
    function consider(points) {
      let length=0;
      for(let i=1;i<points.length;i++) length+=distance(points[i-1],points[i]);
      if(length<shortest){shortest=length;route=points;}
    }
    for(const a of streets(start)) for(const b of streets(end)) {
      if(a.vertical!==b.vertical) consider([start,a,{x:a.vertical?a.x:b.x,y:a.vertical?b.y:a.y},b,end]);
      else if(a.vertical && a.x!==b.x) for(const y of map.roadsY) consider([start,a,{x:a.x,y},{x:b.x,y},b,end]);
      else if(!a.vertical && a.y!==b.y) for(const x of map.roadsX) consider([start,a,{x,y:a.y},{x,y:b.y},b,end]);
      else consider([start,a,b,end]);
    }
    return route;
  }
  function mapDraw() {
    const canvas = controls.map, ctx = canvas.getContext('2d');
    if (!ctx) return;
    const map = world.map, width = canvas.width, height = canvas.height;
    const scale=Math.min((width-12)/map.width,(height-8)/map.height), ox=(width-map.width*scale)/2, oy=(height-map.height*scale)/2;
    const x=value=>ox+value*scale, y=value=>oy+value*scale;
    ctx.fillStyle='#182820';ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#26392d';ctx.fillRect(ox,oy,map.width*scale,map.height*scale);
    ctx.strokeStyle='#869383';ctx.lineWidth=Math.max(2,map.roadWidth*scale*.55);ctx.beginPath();
    for(const road of map.roadsX){ctx.moveTo(x(road),oy);ctx.lineTo(x(road),y(map.height));}
    for(const road of map.roadsY){ctx.moveTo(ox,y(road));ctx.lineTo(x(map.width),y(road));}ctx.stroke();
    if(map.garage){
      const gx=x(map.garage.x),gy=y(map.garage.y);
      ctx.fillStyle='#b8ffde';ctx.fillRect(gx-5,gy-6,11,13);ctx.fillStyle='#173528';ctx.font='bold 11px sans-serif';ctx.fillText('G',gx-4,gy+4);
    }
    for(const site of [...map.properties,map.dealer,...map.venues]){ctx.fillStyle='#d8b9ff';ctx.fillRect(x(site.x)-2,y(site.y)-2,4,4);}
    for(const r of map.races){const p=r.checkpoints[0];ctx.fillStyle='#7dd6ff';ctx.fillRect(x(p.x)-3,y(p.y)-3,6,6);}
    const activeRace=window.RecoilCityWorld.raceView(world).active;if(activeRace?.goal){ctx.fillStyle='#7dd6ff';ctx.fillRect(x(activeRace.goal.x)-4,y(activeRace.goal.y)-4,8,8);}
    const story=window.RecoilCityWorld.a1View(world).story?.goal;if(story){ctx.fillStyle='#f0b0ff';ctx.fillRect(x(story.x)-3,y(story.y)-3,6,6);}
    for(const shop of map.shops){ctx.fillStyle='#96e3d8';ctx.fillRect(x(shop.x)-2,y(shop.y)-2,4,4);}
    for(const remote of world.remotePlayers){ctx.fillStyle='#8acbff';ctx.fillRect(x(remote.x)-3,y(remote.y)-3,6,6);}
    for(const car of world.vehicles)if(car.kind==='patrol'&&car.hp>0){ctx.fillStyle='#ff9986';ctx.fillRect(x(car.x)-1.5,y(car.y)-1.5,3,3);}
    const p=world.player,goal=target();
    if(goal){
      const tx=x(goal.x),ty=y(goal.y);
      ctx.setLineDash([3,3]);ctx.strokeStyle='#ffd783';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x(p.x),y(p.y));
      for(const point of streetRoute(map,p,goal))ctx.lineTo(x(point.x),y(point.y));
      ctx.stroke();ctx.setLineDash([]);
      ctx.save();ctx.translate(tx,ty);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffcd68';ctx.fillRect(-4.5,-4.5,9,9);ctx.restore();
    }
    ctx.save();ctx.translate(x(p.x),y(p.y));ctx.rotate(p.angle);
    ctx.fillStyle='#fffbee';ctx.strokeStyle='#17251e';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-5,4.5);ctx.lineTo(-3,0);ctx.lineTo(-5,-4.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    ctx.font='bold 13px sans-serif';ctx.fillStyle='#fff7de';ctx.fillText('N',4,15);
  }
  async function onlineApi(action,data={},token=sessionStorage.getItem('rx5-token')){
    if(!token)throw Error('Sign in to RECOIL X first.');
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
    try{const r=await fetch('/rx-api/a1/city/'+action,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data),signal:controller.signal,cache:'no-store'});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'City connection failed.'),{status:r.status});return d;}finally{clearTimeout(timeout);}
  }
  async function cityOnlineAction(action){
    if(!world)return;
    if(action==='online-leave'){leaveOnline();renderHub();return;}
    if(onlinePending||onlineConnectBusy)return;
    const code=action==='online-join'?prompt('Enter your friend’s six-character city room code'):null;
    if(action==='online-join'&&!code)return;
    const epoch=++onlineEpoch,token=sessionStorage.getItem('rx5-token');onlinePending=true;onlineConnectBusy=true;
    try{const d=await onlineApi(action==='online-create'?'create':'join',{code},token);if(epoch!==onlineEpoch||!world||token!==sessionStorage.getItem('rx5-token')){await onlineApi('leave',{lease:d.lease},token).catch(()=>{});return;}online={code:d.code,lease:d.lease,token};onlineNote='Room '+d.code;onlineNext=0;}
    catch(e){if(epoch===onlineEpoch)onlineNote=e.message;}
    finally{onlineConnectBusy=false;if(epoch===onlineEpoch)onlinePending=false;if(world&&controls&&!controls.hub.hidden)renderHub();}
  }
  function leaveOnline(){
    const old=online;onlineEpoch++;online=null;onlinePending=false;onlineNote='Offline';remoteTargets.clear();if(world)world.remotePlayers=[];
    if(old)void onlineApi('leave',{lease:old.lease},old.token).catch(()=>{});
  }
  function sampleRemote(r,now){const t=Math.max(0,Math.min(1,(now-r.at)/1000)),a=r.from,b=r.to;return {...b,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle))*t};}
  async function onlinePulse(now){
    if(!online||onlinePending||now<onlineNext||!world)return;
    onlineNext=now+1100;onlinePending=true;const epoch=onlineEpoch,p=world.player;
    try{const d=await onlineApi('pulse',{lease:online.lease,x:p.x,y:p.y,angle:p.angle,vehicle:!!p.vehicleId,inside:!!world.interior,moving:p.motion!=='idle'},online.token);if(epoch!==onlineEpoch||!world)return;const received=performance.now(),visible=d.players.filter(v=>!v.inside);for(const r of visible){const old=remoteTargets.get(r.id);remoteTargets.set(r.id,{from:old?sampleRemote(old,received):r,to:r,at:received});}for(const id of remoteTargets.keys())if(!visible.some(v=>v.id===id))remoteTargets.delete(id);world.remotePlayers=[...remoteTargets.values()].map(v=>sampleRemote(v,received));onlineNote='Room '+d.code+' · '+(d.players.length+1)+' players';}
    catch(e){if(epoch!==onlineEpoch||!world)return;remoteTargets.clear();world.remotePlayers=[];onlineNote=e.message;if([401,403,404,409].includes(e.status)){const message=onlineNote;leaveOnline();onlineNote=message;}}
    finally{if(epoch===onlineEpoch)onlinePending=false;}
  }
  function renderHub(){
    if(!world)return;const v=window.RecoilCityWorld.a1View(world),host=controls.hub;
    const make=(tag,t)=>{const n=document.createElement(tag);n.textContent=t;return n;};
    const add=(label,action,id,disabled=false)=>{const b=make('button',label);b.type='button';b.dataset.cityAction=action;b.dataset.cityId=id||'';b.disabled=disabled;host.append(b);};
    host.replaceChildren(make('h3','City Unleashed'),make('p','City cash: $'+world.career.cash+' · '+(world.notice||'Explore, earn and build your career.')));
    if(world.interior?.safe){host.append(make('p','Inside '+world.interior.name));add('Exit building','leave-interior','');}
    host.append(make('h3','Shared city — free roam'),make('p',onlineNote+' · Local traffic and money remain independent.'));if(online)add('Leave room','online-leave','');else{add('Create private room','online-create','',onlinePending||onlineConnectBusy);add('Join private room','online-join','',onlinePending||onlineConnectBusy);}
    host.append(make('h3','Story campaign'));
    if(v.story){host.append(make('p',v.story.number+'/'+v.story.total+' · '+v.story.name+' — '+v.story.contact+(v.story.goal?' · Next: '+v.story.goal.name:'')));add(v.story.active?'Complete checkpoint':'Start mission','story','',v.story.active&&!v.story.near);if(v.story.active)add('Cancel mission','cancel-story','');}else host.append(make('p','All three story missions completed.'));
    const races=window.RecoilCityWorld.raceView(world);host.append(make('h3','Street races'));if(races.active){host.append(make('p',races.active.name+' · '+Math.ceil(races.active.remaining)+' seconds left'));add('Cancel race','cancel-race','');}else for(const r of races.courses){host.append(make('p',r.name+' · $'+r.pay+(r.best?' · Best '+r.best+'s':'')));add('Start race','race',r.id,!r.near||!world.player.vehicleId||!!world.job||!!world.a1Mission||!!world.heat);}
    host.append(make('h3','Properties'));
    for(const p of v.properties){host.append(make('p',p.name+' · '+(p.owned?'Owned':'$'+p.price)+(p.near?' · Nearby':'')));add(p.owned?'Rest / heal':'Purchase',p.owned?'rest':'buy-property',p.id,!p.near||!!world.player.vehicleId||(!p.owned&&world.career.cash<p.price));if(p.owned)add('Enter home','enter-property',p.id,!p.near||!!world.player.vehicleId);}
    host.append(make('h3','Eastline Motors'));
    for(const m of v.cars){host.append(make('p',m.name+' · '+(m.owned?'Owned':'$'+m.price)));add(m.owned?'Recall to dealership':'Buy vehicle',m.owned?'recall-car':'buy-car',m.id,!v.dealer.near||!!world.player.vehicleId||(!m.owned&&world.career.cash<m.price));}
    if(v.upgrade){host.append(make('p','Engine level '+v.upgrade.level+'/3'));add('Upgrade engine · $'+v.upgrade.price,'upgrade','',!v.upgrade.near||v.upgrade.level>=3||world.career.cash<v.upgrade.price);}
    host.append(make('h3','City venues'));for(const p of v.venues){host.append(make('p',p.name+(p.visited?' · Visited':'')));add('Visit','visit',p.id,!p.near||!!world.player.vehicleId);}
  }
  function refresh() {
    if (!world) return;
    const p=world.player,car=world.vehicles.find(v=>v.id===p.vehicleId),goal=world.job?target():null;
    setText(controls.area,world.district+' · '+String(Math.floor(world.cityHour)).padStart(2,'0')+':'+String(Math.floor(world.cityHour%1*60)).padStart(2,'0')+' · '+world.weather+(online?' · '+onlineNote:'')+' · '+(options.mode==='first'?'First person':'Third person'));
    setText(controls.speed,car ? Math.round(Math.abs(car.speed))+' u/s' : p.motion==='idle'?'On foot':p.motion[0].toUpperCase()+p.motion.slice(1));
    setText(controls.cash,'$'+world.career.cash.toLocaleString());
    setText(controls.heat,'★'.repeat(world.heat)+'☆'.repeat(5-world.heat));
    controls.heat.setAttribute('aria-label','Wanted level '+world.heat+' of 5');controls.heat.title=controls.heat.getAttribute('aria-label');
    const gear=world.weapons[world.weapon],ammo=world.ammo[world.weapon];
    setText(controls.loadout,car?'Condition '+Math.ceil(car.hp)+'%':'HP '+Math.ceil(p.hp)+(gear?' · '+gear.name+' · '+(world.reloadAt?'Reloading':ammo.mag+'/'+ammo.stock):''));
    controls.skills.hidden=!!car;controls.reticle.hidden=!!car;
    controls.reticle.classList.toggle('hit',world.hitAt!=null&&world.elapsed-world.hitAt<.22);
    const shop=window.RecoilCityWorld.nearbyShop(world);controls.shop.hidden=!shop||!!shop.safe;controls.death.hidden=!world.deathUntil;controls.interior.hidden=!!car||!shop||shop.id==='repair';setText(controls.interior.firstElementChild,world.interior?(world.interior.safe?'Exit building':'Exit shop'):'Enter shop');controls.rob.hidden=!world.interior||!!world.interior.safe;controls.rob.disabled=!!world.interior&&world.interior.cooldown>world.elapsed;
    if(shop&&!shop.safe)setText(controls.shop.firstElementChild,shop.name+' · $'+shop.price);
    controls.heat.toggleAttribute('data-hot',world.heat>0);
    const job=world.job || world.offer;
    setText(controls.jobTitle,job ? job.kind+' · $'+job.pay : 'Dispatch');
    const distance=goal ? Math.hypot(goal.x-p.x,goal.y-p.y) : 0;
    const direction=goal ? ['E','SE','S','SW','W','NW','N','NE'][(Math.round(Math.atan2(goal.y-p.y,goal.x-p.x)/(Math.PI/4))+8)%8] : '';
    const pickup=world.job?.stage==='pickup';
    let objective=job ? job.pickup.name+' → '+job.dropoff.name : 'Explore the city.';
    if(goal) objective=(pickup?'Pick up at ':'Drop off at ')+goal.name+' · '+Math.round(distance)+' u '+direction;
    setText(controls.objective,objective);
    const nearby=goal && distance<=window.RecoilCityWorld.jobRadius;
    const needsCar=world.job?.kind==='Passenger'&&!car;
    setText(controls.job.firstElementChild,goal ? (pickup?'Pick up':'Drop off') : 'Take job');
    controls.job.disabled=!job || (!!goal && (!nearby || needsCar));
    const candidate=world.vehicles.find(v=>v.id===world.nearbyVehicle);
    setText(controls.vehicle.firstElementChild,car ? 'Exit vehicle' : candidate&&candidate.kind!=='parked' ? 'Take vehicle' : 'Enter vehicle');
    controls.vehicle.disabled=!car && world.nearbyVehicle==null;
    controls.brake.hidden=!car || !matchMedia('(pointer:coarse),(max-width:740px)').matches;
    const garage=window.RecoilCityWorld.garageView?.(world);
    controls.paint.hidden=!garage?.near;
    if(garage?.near){
      setText(controls.paint.firstElementChild,garage.eligible ? 'Respray · '+garage.nextFinish+' · $'+garage.price : garage.reason);
      controls.paint.disabled=!garage.eligible;
    }
    if(nearby && needsCar) setText(controls.objective,objective+' · Vehicle required');
    const story=window.RecoilCityWorld.a1View(world).story;if(!world.job&&story?.active&&story.goal){setText(controls.jobTitle,story.name);setText(controls.objective,'Story checkpoint: '+story.goal.name+' · '+Math.round(Math.hypot(p.x-story.goal.x,p.y-story.goal.y))+' u');controls.job.disabled=true;}
    const race=window.RecoilCityWorld.raceView(world).active;if(race){controls.job.disabled=true;setText(controls.jobTitle,race.name+' · '+Math.ceil(race.remaining)+'s');setText(controls.objective,'Checkpoint '+(race.index+1)+'/'+race.total+' · '+Math.round(Math.hypot(p.x-race.goal.x,p.y-race.goal.y))+' u');}
    if(world.notice!==lastNotice){lastNotice=world.notice;setText(controls.notice,world.notice);}
    mapDraw();
    saveCareer();
  }
  function saveCareer(){
    if(!world)return;
    const value=JSON.stringify(world.career);
    if(value===lastCareer)return;
    try{localStorage.setItem(careerKey,value);lastCareer=value;}catch{}
  }
  function clearHeld(){held.clear();pointers.clear();lookPointer=null;firing=false;queuedShot=false;dialog?.querySelectorAll('[data-held]').forEach(b=>b.removeAttribute('data-held'));}
  function act(action){
    if(!world || paused||world.deathUntil)return;
    if(action==='vehicle'){if(window.RecoilCityWorld.interact(world)){yaw=world.player.angle;tilt=0;manualUntil=0;}}
    else if(action==='jump')window.RecoilCityWorld.jump(world);
    else if(action==='shop')window.RecoilCityWorld.shop(world);
    else if(action==='interior'){if(window.RecoilCityWorld.enterShop(world)){yaw=world.player.angle;tilt=0;}}
    else if(action==='rob')window.RecoilCityWorld.robShop(world);
    else if(action==='reload')window.RecoilCityWorld.reload(world);
    else if(action==='weapon')window.RecoilCityWorld.selectWeapon(world,world.weapon+1);
    else if(action==='camera'){options.mode=options.mode==='first'?'third':'first';applyOptions();}
    else if(action==='center'){yaw=world.player.angle;tilt=0;manualUntil=0;}
    else if(action==='paint')window.RecoilCityWorld.respray(world);
    else window.RecoilCityWorld.job(world);
    refresh();
    controls.streets.focus({preventScroll:true});
  }
  function setHelp(show){
    if(!world)return;
    paused=show;clearHeld();controls.help.hidden=!show;controls.hud.inert=show;previousTime=0;
    if(show){
      dialog.querySelector('[data-option=mode]').value=options.mode;dialog.querySelector('[data-option=quality]').value=options.quality;
      const c=world.career;
      setText(controls.career,c.deliveries+' deliveries · '+c.trips+' passenger trips · '+(c.discoveries?.length||0)+'/3 discoveries'+(c.bestTime>0?' · Best job '+Math.round(c.bestTime)+'s':''));
      controls.resume.focus({preventScroll:true});
    }else controls.streets.focus({preventScroll:true});
  }
  function keyboard(event){
    if(!world || event.ctrlKey || event.metaKey || event.altKey)return;
    event.stopImmediatePropagation();
    if(event.code==='Escape' && event.type==='keydown' && !event.repeat){
      event.preventDefault();if(paused)setHelp(false);else close();return;
    }
    if(paused || event.code==='Tab')return;
    if(event.code==='Space'&&!world.player.vehicleId&&!event.target.closest?.('button')){
      event.preventDefault();if(event.type==='keydown'&&!event.repeat)act('jump');return;
    }
    if(/^Digit[1-4]$/.test(event.code)&&event.type==='keydown'){window.RecoilCityWorld.selectWeapon(world,+event.code.slice(-1)-1);refresh();return;}
    if(event.code==='Space' && event.target.closest?.('button'))return;
    const key=arrowCodes[event.code];
    if(key){
      event.preventDefault();
      if(event.type==='keydown'){held.add(event.code);if(key==='fire'&&!event.repeat)queuedShot=true;}else held.delete(event.code);
      return;
    }
    const action={KeyJ:'job',KeyE:'vehicle',KeyG:'paint',KeyQ:'weapon',KeyR:'reload',KeyV:'camera',KeyC:'center',KeyB:'shop',KeyT:'interior',KeyH:'rob'}[event.code];
    if(event.type==='keydown'&&!event.repeat && action){
      event.preventDefault();act(action);
    }
  }
  function tick(now){
    if(!world)return;
    frame=requestAnimationFrame(tick);
    if(online&&online.token!==sessionStorage.getItem('rx5-token'))leaveOnline();
    if(!document.hidden)void onlinePulse(now);
    if(online)world.remotePlayers=[...remoteTargets.values()].map(v=>sampleRemote(v,now));
    if(paused || document.hidden){previousTime=0;nextDraw=0;return;}
    if(now<nextDraw-.75)return;
    nextDraw=(nextDraw && now-nextDraw<frameInterval ? nextDraw : now)+frameInterval;
    const elapsed=previousTime ? Math.min(.1,(now-previousTime)/1000) : 0;
    previousTime=now;
    const pressed=name => [...held].some(code=>arrowCodes[code]===name) || [...pointers.values()].includes(name);
    const forward=Number(pressed('up'))-Number(pressed('down')),turn=Number(pressed('right'))-Number(pressed('left'));
    const look=Number(pressed('lookRight'))-Number(pressed('lookLeft')),vertical=Number(pressed('lookUp'))-Number(pressed('lookDown'));
    if(look||vertical){yaw+=look*elapsed*1.85;tilt=Math.max(-.6,Math.min(.62,tilt+vertical*elapsed));manualUntil=world.elapsed+1.4;}
    const p=world.player,car=p.vehicleId;
    if(car && !lookPointer && world.elapsed>=manualUntil){
      const delta=p.angle-yaw;yaw+=Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-elapsed*5));
    }
    const cos=Math.cos(yaw),sin=Math.sin(yaw),walkX=cos*forward-sin*turn,walkY=sin*forward+cos*turn;
    const view={...options,yaw,tilt,aspect:controls.streets.clientWidth/Math.max(1,controls.streets.clientHeight)};
    cam=window.RecoilCityView.camera(world,view);
    const aim={yaw,pitch:cam.pitch,origin:cam};
    window.RecoilCityWorld.step(world,{forward,turn,walkX,walkY,sprint:pressed('sprint'),brake:pressed('brake'),fire:queuedShot||firing||pressed('fire'),aim},elapsed);
    if(elapsed>0)queuedShot=false;
    if(!car && (forward||turn||options.mode==='first'||firing||pressed('fire')))p.angle=yaw;
    cam=window.RecoilCityView.camera(world,view);
    window.RecoilCityView.draw(controls.streets,world,cam,controls.sky);
    const night=world.cityHour<6||world.cityHour>=19;controls.sky.style.filter=night?'brightness(.4) saturate(.75)':world.weather==='Rain'?'brightness(.72)':'';controls.streets.style.filter=night?'brightness(.58) saturate(.82)':world.weather==='Haze'?'contrast(.86) sepia(.16)':world.weather==='Rain'?'brightness(.82) saturate(.75)':'';
    if(now>=nextHud){refresh();nextHud=now+100;}
  }
  function applyOptions(){
    world.quality=options.quality;world.populationAt=0;
    frameInterval=1000/(options.quality==='low'||matchMedia('(pointer:coarse)').matches?30:60);
    try{localStorage.setItem(prefsKey,JSON.stringify(options));}catch{}
    refresh();
  }
  function open(){
    if(world || !window.RecoilCityWorld || !window.RecoilCityView)return false;
    if(!dialog)mount();
    let career;
    try{career=JSON.parse(localStorage.getItem(careerKey));}catch{}
    let prefs={};try{prefs=JSON.parse(localStorage.getItem(prefsKey))||{};}catch{}
    options={mode:prefs.mode==='first'?'first':'third',quality:['low','standard','high'].includes(prefs.quality)?prefs.quality:(navigator.hardwareConcurrency<=4||matchMedia('(pointer:coarse)').matches?'low':'standard')};
    world=window.RecoilCityWorld.create({career,quality:options.quality,...window.RecoilCityGame?.loadout()});yaw=world.player.angle=-.16;tilt=0;manualUntil=0;lastCareer=JSON.stringify(world.career);lastNotice=null;
    previousFocus=document.activeElement;
    document.exitPointerLock?.();
    dialog.showModal();
    applyOptions();window.RecoilCityGame?.suspendMenuMusic?.();window.RecoilCityRadio?.enterCity();
    setHelp(false);previousTime=0;nextHud=0;nextDraw=0;
    window.addEventListener('keydown',keyboard,true);window.addEventListener('keyup',keyboard,true);
    window.addEventListener('blur',clearHeld);document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pagehide',saveCareer);
    refresh();frame=requestAnimationFrame(tick);
    return true;
  }
  function visibility(){clearHeld();previousTime=0;if(document.hidden)saveCareer();}
  function close(){
    if(!world)return;
    leaveOnline();saveCareer();world=null;cancelAnimationFrame(frame);clearHeld();paused=false;
    window.removeEventListener('keydown',keyboard,true);window.removeEventListener('keyup',keyboard,true);
    window.removeEventListener('blur',clearHeld);document.removeEventListener('visibilitychange',visibility);
    window.removeEventListener('pagehide',saveCareer);
    window.RecoilCityRadio?.leaveCity();window.RecoilCityView.release(controls.streets);
    dialog.close();dialog.remove();dialog=null;controls=null;cam=null;
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null;
  }
  window.RecoilCity=Object.freeze({open,close,get active(){return !!world;}});
})();
