// Standalone city session. Driving and walking share the same world and camera.
(() => {
  'use strict';
  if (window.RecoilCity) return;
  const careerKey = 'recoil-x.city.career.v1';
  let dialog, controls, world, frame, previousTime, nextHud, nextDraw, frameInterval, previousFocus;
  let lastCareer, lastNotice, paused = false;
  const held = new Set(), pointers = new Map();
  const arrowCodes = {KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'brake'};
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
    @media(max-width:450px){#recoil-city .rc-menu button{font-size:12px;padding:6px 8px}#recoil-city .rc-jobhead{gap:4px}#recoil-city .rc-nav{width:98px}}
    @media(max-height:420px){#recoil-city .rc-place{padding:4px 8px}#recoil-city .rc-nav{width:96px}}
  `;
  document.head.append(style);
  function mount() {
    dialog = document.createElement('dialog');
    dialog.id = 'recoil-city';
    dialog.setAttribute('aria-labelledby','rc-title');
    dialog.innerHTML = `
      <canvas class="rc-streets" tabindex="-1" aria-label="City streets. Use the map and dispatch directions to find your destination."></canvas>
      <div class="rc-hud"><div class="rc-head"><div class="rc-panel rc-place"><h2 id="rc-title">Recoil City</h2><span class="rc-area"></span></div>
        <div class="rc-menu"><button type="button" data-click="help">Controls</button><button type="button" data-click="exit">Exit city</button></div></div>
        <div class="rc-bottom"><div class="rc-panel rc-nav"><canvas class="rc-map" width="250" height="150" aria-label="City map, north at the top"></canvas>
          <div class="rc-trip"><span class="rc-speed"></span><span class="rc-cash"></span></div></div>
          <div class="rc-panel rc-job"><div class="rc-jobhead"><span class="rc-jobtitle"></span><span class="rc-heat"></span></div>
          <p class="rc-objective"></p><div class="rc-actions"><button type="button" data-click="job" data-primary><span></span><kbd>J</kbd></button>
          <button type="button" data-click="vehicle"><span></span><kbd>E</kbd></button><button type="button" data-hold="brake" hidden>Brake</button>
          <button type="button" data-click="paint" hidden><span></span><kbd>G</kbd></button></div></div></div>
        <div class="rc-pad" aria-label="Movement controls"><button type="button" class="rc-up" data-hold="up" aria-label="Up or accelerate"></button>
          <button type="button" class="rc-left" data-hold="left" aria-label="Left"></button><button type="button" class="rc-down" data-hold="down" aria-label="Down or reverse"></button>
          <button type="button" class="rc-right" data-hold="right" aria-label="Right"></button></div>
        <p class="rc-notice" role="status" aria-live="polite"></p>
      </div><div class="rc-help" hidden><section class="rc-panel rc-sheet" aria-labelledby="rc-guide-title"><h3 id="rc-guide-title">City controls</h3>
        <dl><dt>On foot</dt><dd>WASD or arrow keys to walk.</dd><dt>In a car</dt><dd>Up to accelerate, down to reverse, left and right to steer. Space to brake.</dd>
        <dt>E</dt><dd>Enter a nearby vehicle or exit at low speed.</dd><dt>J</dt><dd>Take a job, pick up, or drop off at the marked stop.</dd>
        <dt>G</dt><dd>Park your Vista at Sandline Customs, marked G on the map, to buy a new finish.</dd>
        <dt>Esc</dt><dd>Leave the city.</dd></dl><p class="rc-career"></p><button type="button" data-click="resume" data-primary>Resume</button></section></div>`;
    document.body.append(dialog);
    const find = selector => dialog.querySelector(selector);
    controls = {streets:find('.rc-streets'),map:find('.rc-map'),area:find('.rc-area'),speed:find('.rc-speed'),cash:find('.rc-cash'),jobTitle:find('.rc-jobtitle'),
      heat:find('.rc-heat'),objective:find('.rc-objective'),notice:find('.rc-notice'),job:find('[data-click="job"]'),vehicle:find('[data-click="vehicle"]'),
      brake:find('[data-hold="brake"]'),paint:find('[data-click="paint"]'),help:find('.rc-help'),career:find('.rc-career'),resume:find('[data-click="resume"]'),hud:find('.rc-hud')};
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (paused) setHelp(false); else close(); });
    dialog.addEventListener('click', event => {
      const action = event.target.closest('button')?.dataset.click;
      if (action === 'exit') close();
      if (action === 'help' || action === 'resume') setHelp(action === 'help');
      if (action === 'vehicle' || action === 'job' || action === 'paint') act(action);
    });
    dialog.addEventListener('pointerdown', event => {
      const button = event.target.closest('[data-hold]');
      if (!button || paused) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId,button.dataset.hold);
      button.setAttribute('data-held','');
    });
    function release(event) {
      const name = pointers.get(event.pointerId);
      if (!name) return;
      pointers.delete(event.pointerId);
      if (![...pointers.values()].includes(name)) find('[data-hold="'+name+'"]').removeAttribute('data-held');
    }
    for (const type of ['pointerup','pointercancel','lostpointercapture']) dialog.addEventListener(type,release);
  }
  function setText(node,value) { if(node.textContent !== value) node.textContent=value; }
  function target() { return world.job && (world.job.stage === 'pickup' ? world.job.pickup : world.job.dropoff); }
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
  function refresh() {
    if (!world) return;
    const p=world.player,car=world.vehicles.find(v=>v.id===p.vehicleId),goal=target();
    setText(controls.area,world.district);
    setText(controls.speed,car ? Math.round(Math.abs(car.speed))+' u/s' : 'On foot');
    setText(controls.cash,'$'+world.career.cash.toLocaleString());
    setText(controls.heat,world.heat ? 'Heat '+world.heat+'/3' : 'Heat 0/3');
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
    setText(controls.vehicle.firstElementChild,car ? 'Exit vehicle' : 'Enter vehicle');
    controls.vehicle.disabled=!car && world.nearbyVehicle==null;
    controls.brake.hidden=!car || !matchMedia('(pointer:coarse),(max-width:740px)').matches;
    const garage=window.RecoilCityWorld.garageView?.(world);
    controls.paint.hidden=!garage?.near;
    if(garage?.near){
      setText(controls.paint.firstElementChild,garage.eligible ? 'Respray · '+garage.nextFinish+' · $'+garage.price : garage.reason);
      controls.paint.disabled=!garage.eligible;
    }
    if(nearby && needsCar) setText(controls.objective,objective+' · Vehicle required');
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
  function clearHeld(){held.clear();pointers.clear();dialog?.querySelectorAll('[data-held]').forEach(b=>b.removeAttribute('data-held'));}
  function act(action){
    if(!world || paused)return;
    if(action==='vehicle')window.RecoilCityWorld.interact(world);
    else if(action==='paint')window.RecoilCityWorld.respray(world);
    else window.RecoilCityWorld.job(world);
    refresh();
    controls.streets.focus({preventScroll:true});
  }
  function setHelp(show){
    if(!world)return;
    paused=show;clearHeld();controls.help.hidden=!show;controls.hud.inert=show;previousTime=0;
    if(show){
      const c=world.career;
      setText(controls.career,c.deliveries+' deliveries · '+c.trips+' passenger trips'+(c.bestTime>0?' · Best job '+Math.round(c.bestTime)+'s':''));
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
    if(event.code==='Space' && event.target.closest?.('button'))return;
    const key=arrowCodes[event.code];
    if(key){
      event.preventDefault();
      if(event.type==='keydown')held.add(event.code);else held.delete(event.code);
      return;
    }
    const action={KeyJ:'job',KeyE:'vehicle',KeyG:'paint'}[event.code];
    if(event.type==='keydown'&&!event.repeat && action){
      event.preventDefault();act(action);
    }
  }
  function tick(now){
    if(!world)return;
    frame=requestAnimationFrame(tick);
    if(paused || document.hidden){previousTime=0;nextDraw=0;return;}
    if(now<nextDraw-.75)return;
    nextDraw=(nextDraw && now-nextDraw<frameInterval ? nextDraw : now)+frameInterval;
    const elapsed=previousTime ? Math.min(.1,(now-previousTime)/1000) : 0;
    previousTime=now;
    const pressed=name => [...held].some(code=>arrowCodes[code]===name) || [...pointers.values()].includes(name);
    const forward=Number(pressed('up'))-Number(pressed('down')),turn=Number(pressed('right'))-Number(pressed('left'));
    // Project screen-relative walking onto the isometric streets. Vehicle steering stays relative to the car.
    const length=Math.max(1,Math.hypot(turn,forward));
    const walkX=(turn-forward)*Math.SQRT1_2/length,walkY=(-turn-forward)*Math.SQRT1_2/length;
    window.RecoilCityWorld.step(world,{forward,turn,walkX,walkY,brake:pressed('brake')},elapsed);
    window.RecoilCityView.draw(controls.streets,world);
    if(now>=nextHud){refresh();nextHud=now+100;}
  }
  function open(){
    if(world || !window.RecoilCityWorld || !window.RecoilCityView)return false;
    if(!dialog)mount();
    let career;
    try{career=JSON.parse(localStorage.getItem(careerKey));}catch{}
    world=window.RecoilCityWorld.create({career});lastCareer=JSON.stringify(world.career);lastNotice=null;
    previousFocus=document.activeElement;
    document.exitPointerLock?.();
    dialog.showModal();
    frameInterval=1000/(matchMedia('(pointer:coarse)').matches || navigator.hardwareConcurrency<=4 ? 30 : 60);
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
    saveCareer();world=null;cancelAnimationFrame(frame);clearHeld();paused=false;
    window.removeEventListener('keydown',keyboard,true);window.removeEventListener('keyup',keyboard,true);
    window.removeEventListener('blur',clearHeld);document.removeEventListener('visibilitychange',visibility);
    window.removeEventListener('pagehide',saveCareer);
    dialog.close();dialog.remove();dialog=null;controls=null;
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null;
  }
  window.RecoilCity=Object.freeze({open,close,get active(){return !!world;}});
})();
