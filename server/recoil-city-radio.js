// The supplied Vol. 1 recordings and the original four live game cues share one player.
(() => {
  'use strict';
  const root=new URL('city-radio/',document.currentScript.src), key='recoil-x.radio.v1';
  const bridge=()=>window.RecoilCityGame;
  const cueNames={lobby:'Lobby',match:'Match',victory:'Victory',results:'Results'};
  const cues=Object.keys(cueNames).map(cue=>({id:'cue-'+cue,cue,title:cueNames[cue],mode:'Original game cue'}));
  let prefs={};try{prefs=JSON.parse(localStorage.getItem(key))||{};}catch{}
  let selected=typeof prefs.track==='string'?prefs.track:'recoilcity',repeat=prefs.repeat!==false;
  let volume=Number.isFinite(prefs.volume)?Math.max(0,Math.min(1,prefs.volume)):.55;
  let wantCity=prefs.city!==false, sessionCity=false,cityStarted=false, playing=false, pending=false;
  let album=[],catalog=[],panels=new Set(), serial=0, cueTimer, gain, cueBeat=0, cueTime=0, cueStarted=0, cueOffset=0, status='';
  const audio=new Audio();audio.preload='none';audio.volume=volume;audio.loop=repeat;
  const track=()=>catalog.find(t=>t.id===selected);
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify({track:selected,repeat,volume,city:wantCity}));}catch{}};
  function clock(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
  function fillPanel(el){
    const list=el.querySelector('select');list.replaceChildren();
    for(const [label,items] of [['RECOIL X Radio · Vol. 1',album],['Original game cues',cues]]){
      const group=document.createElement('optgroup');group.label=label;
      items.forEach((t,i)=>group.append(new Option((t.cue?'':String(i+1).padStart(2,'0')+' · ')+t.title,t.id)));list.append(group);
    }
  }
  function cueDuration(t){return 64*30/bridge().cues[t.cue].tempo;}
  function prune(){for(const el of panels)if(!el.isConnected)panels.delete(el);}
  function sync(){
    const t=track(),pos=t?.cue?cueOffset+(playing&&gain?gain.context.currentTime-cueStarted:0):audio.currentTime||0;
    const duration=t?.cue?cueDuration(t):(Number.isFinite(audio.duration)?audio.duration:t?.seconds||0);
    prune();for(const el of panels){
      const get=q=>el.querySelector(q);
      get('select').value=selected;get('[data-radio=play]').textContent=playing||pending?'Pause':'Play';
      get('[data-radio=repeat]').checked=repeat;get('[data-radio=volume]').value=Math.round(volume*100);
      const seek=get('[data-radio=seek]');seek.disabled=!duration;seek.max=duration||1;seek.value=duration?Math.min(pos,duration):0;
      get('output').textContent=clock(pos)+(duration?' / '+clock(duration):'');
      get('.rx-radio-meta').textContent=t?t.mode+(t.style?' · '+t.style+' · '+t.bpm+' BPM':''):'';
      get('.rx-radio-status').textContent=status;
    }
  }
  function stop(){
    serial++;pending=false;playing=false;audio.pause();
    clearInterval(cueTimer);
    if(gain){cueOffset+=gain.context.currentTime-cueStarted;gain.disconnect();gain=null;}
    sync();
  }
  function select(id){
    if(!catalog.some(t=>t.id===id))return;
    stop();selected=id;cueOffset=0;status='';audio.removeAttribute('src');audio.load();
    const t=track();if(t.file)audio.src=new URL(t.file,root).href;
    persist();sync();
  }
  function startCue(t){
    const game=bridge(),ac=game?.audioContext();if(!ac)throw Error('Sound unavailable');
    gain=ac.createGain();gain.gain.value=volume;gain.connect(ac.destination);
    const step=60/game.cues[t.cue].tempo/2;
    cueBeat=Math.floor(cueOffset/step);cueStarted=ac.currentTime;cueTime=cueStarted+.035;
    const tick=()=>{
      if(!gain)return;
      const duration=cueDuration(t);
      if(cueOffset+ac.currentTime-cueStarted>=duration){
        if(!repeat){next(1);return;}
        cueOffset=0;cueStarted=ac.currentTime;cueBeat=0;cueTime=ac.currentTime+.015;
      }
      if(cueTime<ac.currentTime-.2)cueTime=ac.currentTime+.02;
      while(cueTime<ac.currentTime+.13){game.scoreBeat(ac,t.cue,cueBeat++,cueTime,step,gain);cueTime+=step;}
      sync();
    };
    playing=true;pending=false;tick();cueTimer=setInterval(tick,80);
  }
  async function play(){
    const t=track();if(!t||playing||pending)return;
    if(!bridge()?.audioEnabled()){status='Turn on game sound to play the radio.';sync();return;}
    const request=++serial;pending=true;status='';sync();
    try{
      if(t.cue)startCue(t);
      else{
        if(!audio.hasAttribute('src'))audio.src=new URL(t.file,root).href;
        await audio.play();if(request!==serial){if(!playing&&!pending)audio.pause();return;}pending=false;playing=true;
      }
    }catch{if(request!==serial)return;stop();status='Playback paused. Press Play to retry.';}
    sync();
  }
  function next(by,autoplay=true){
    const i=catalog.findIndex(t=>t.id===selected);
    select(catalog[(i+by+catalog.length)%catalog.length].id);if(autoplay)play();
  }
  audio.addEventListener('ended',()=>{if(!repeat)next(1);});
  audio.addEventListener('error',()=>{if(!audio.hasAttribute('src'))return;stop();status='Track unavailable. Select another track or retry.';sync();});
  for(const event of ['loadedmetadata','timeupdate','durationchange'])audio.addEventListener(event,sync);
  function enterCity(){
    sessionCity=true;if(!catalog.length)return;
    if(wantCity&&!playing&&!pending){cityStarted=true;play();}
  }
  function leaveCity(){sessionCity=false;if(cityStarted)stop();cityStarted=false;}
  function unmount(root){for(const el of panels)if(root?.contains(el))panels.delete(el);prune();}
  function mount(slot){
    if(!slot||slot.querySelector('.rx-city-radio'))return;
    const el=document.createElement('section');el.className='rx-city-radio';el.setAttribute('aria-label','Recoil Radio');
    el.innerHTML='<h3>Recoil Radio</h3><label>Soundtrack<select aria-label="Soundtrack"></select></label><small class="rx-radio-meta"></small><div class="rx-radio-timing"><input data-radio="seek" aria-label="Playback position" type="range" min="0" max="1" step=".1"><output></output></div><div class="rx-radio-transport"><button type="button" data-radio="prev">Previous</button><button type="button" data-radio="play">Play</button><button type="button" data-radio="next">Next</button></div><div class="rx-radio-mix"><label><input data-radio="repeat" type="checkbox"> Repeat track</label><label>Volume <input data-radio="volume" type="range" min="0" max="100"></label></div><small class="rx-radio-status" role="status"></small>';
    slot.append(el);panels.add(el);fillPanel(el);sync();
    el.querySelector('select').onchange=e=>{const active=playing||pending;select(e.target.value);if(active)play();};
    el.addEventListener('click',e=>{
      const action=e.target.closest('button')?.dataset.radio;
      if(!action||!catalog.length)return;
      if(action==='prev'||action==='next')next(action==='prev'?-1:1);
      else if(action==='play'){if(playing||pending)stop();else play();}
      if(sessionCity){wantCity=playing||pending;cityStarted=true;persist();}
    });
    el.addEventListener('input',e=>{
      const type=e.target.dataset.radio;
      if(type==='repeat'){repeat=e.target.checked;audio.loop=repeat;}
      if(type==='volume'){volume=Number(e.target.value)/100;audio.volume=volume;if(gain)gain.gain.value=volume;}
      if(type==='seek'){
        if(track()?.cue){
          const active=playing,position=Number(e.target.value);stop();cueOffset=position;
          if(active)play();
        }else if(Number.isFinite(audio.duration))audio.currentTime=Number(e.target.value);
      }
      if(type==='repeat'||type==='volume')persist();sync();
    });
  }
  const css=document.createElement('style');css.textContent=`
  .rx-city-radio{margin:12px 0;padding:14px 0;border-block:1px solid #aaa6;display:grid;gap:7px;color:inherit;text-align:start}
  .rx-city-radio h3{margin:0;font:700 18px/1.25 Barlow,system-ui,sans-serif;color:inherit}
  .rx-city-radio label{font:600 13px/1.35 system-ui;color:inherit}.rx-city-radio select{display:block;width:100%;margin-top:4px;max-width:100%;border:1px solid #9d967c;border-radius:5px;background:#28322d;color:#fff4da;padding:8px}
  .rx-radio-meta,.rx-radio-status,.rx-radio-timing output{font:12px/1.35 system-ui;color:inherit}.rx-radio-status:empty{display:none}
  .rx-radio-timing,.rx-radio-transport,.rx-radio-mix,.rx-radio-mix label{display:flex;align-items:center;gap:7px}.rx-radio-timing input{flex:1;min-width:50px}.rx-radio-timing output{min-width:72px;text-align:end}
  .rx-radio-transport button,#recoil-city .rx-radio-transport button{width:auto;min-height:38px;flex:1;margin:0;padding:6px 8px;border:1px solid #a1967d;border-radius:6px;background:#37453d;color:#fff2d8;font:650 13px system-ui}
  .rx-radio-transport button[data-radio=play],#recoil-city .rx-radio-transport button[data-radio=play]{background:#f2c879;color:#312a1e}
  .rx-radio-mix{flex-wrap:wrap;justify-content:space-between}.rx-city-radio input{accent-color:#e6b75f}.rx-radio-mix input[type=range]{width:75px}`;
  document.head.append(css);
  function mountMain(){mount(document.querySelector('#z1SettingsMenu .z1-screen-body'));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountMain,{once:true});else mountMain();
  window.RecoilCityRadio=Object.freeze({mount,unmount,enterCity,leaveCity,get playing(){return playing||pending;},
    masterChanged(){if(!bridge()?.audioEnabled())stop();}});
  fetch(new URL('tracks.json',root)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(items=>{
    album=items;catalog=[...album,...cues];if(!track())selected='recoilcity';
    prune();for(const el of panels)fillPanel(el);sync();if(sessionCity)enterCity();
  }).catch(()=>{catalog=cues;selected='cue-lobby';status='Recording library unavailable. Original game cues are available.';sync();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(playing||pending))stop();});
  window.addEventListener('pagehide',stop);
})();
