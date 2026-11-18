const assert=require('node:assert/strict');
const {test}=require('node:test');
const {makeHarness}=require('./helpers/dom-harness.cjs');
const bridge=`globalThis.crownTest={
  prefs:ascPrefs,client:ascClient,live:z2Live,pl,editor:ascEdit,choose:pickDevice,open:ascOpen,
  play:ascAcademy,pad:ascPadMenus,device:ascCurrentDevice,quit:()=>quit(),run:()=>z3Run,hit:bot=>killBot(bot,pl),
  step:(dt,now)=>simulate(dt,now),fire:()=>fire(),copy:ascCopy,diag:ascDiagnostics,decode:ascDecode,
  edit:ascEditMap,route:ascHasRoute,clean:ascCleanCells,pack:ascPackVerts,load:ascLoadChunk,trim:ascTrimChunks,
  editions:RXSE_EDITIONS,seasonOpen:rxseIsActive,clock:t=>{vxClockUnix=t;vxClockPerf=performance.now();vxClockStatus='verified';},
  balance:()=>coins,buyPass:buyPassTier,tier:()=>passTier,price:()=>passCost(passTier+1),caseCost:V8_CASE_COST,finishes:()=>v8Owned,
  gpuTargets:p=>{crownUltraPipeline=p;crownDropUltra();},setGL:fake=>{gl=fake;},access:z3AccessApply,render:ascWorldDraw,weapon:ascDrawHeld,rooms:ascRooms,
  controls:z2Simulate,bindSocket:socket=>{z1Socket=socket;z1SocketReady=true;},begin:z2Begin,packet:z2Packet,actor:(profile)=>{z1Account=profile;},shot:z2Shot,profile:ascProfile,
  setupDisplay:(map,rules,status)=>{z2Live.match={field:map,ascRules:rules,mode:'payload',names:new Map()};z2Live.snapshot={asc:status,t:100};},
};`;
const make=()=>makeHarness({},undefined,null,bridge);
const el=(g,id)=>g.ui.getElementById(id);
const textButton=(g,parent,text)=>{const b=el(g,parent).querySelectorAll('button').find(b=>b.textContent===text);assert(b,text);return b;};
const plain=v=>JSON.parse(JSON.stringify(v));
test('A15 three Aim Academy drills launch from the hub, score hits and retain a personal best',()=>{
  for(const [kind,name] of [['moving','Moving targets'],['reflex','Reflex drill'],['accuracy','Accuracy test']]){
    const g=make(),{api:a}=g;a.choose(false);el(g,'ascHubLink').click();textButton(g,'ascHub',name).click();
    const run=a.run();assert.equal(run.drill,kind);const x=run.target.x;g.perf(1500);a.step(.05,1.5);
    if(kind==='moving')assert.notEqual(run.target.x,x);
    a.hit(run.target);assert.equal(run.hits,1);assert.equal(run.reactions[0],500);
    g.perf(2200);a.step(.05,2.2);assert(run.target.alive);run.time=29.98;g.perf(31150);a.step(.05,31.15);
    assert.match(el(g,'endTitle').textContent,/Best/);assert(+g.local.getItem('zone90v2_rx_asc_aim_'+kind)>0);
  }
});
test('A20 legendary evolution geometry is gated by account mastery and adds no weapon stats',()=>{
  const g=make(),a=g.api;a.choose(false);a.actor({id:7});a.client.actor=7;a.client.profile={mastery:[{weapon:0,tier:2}]};a.prefs.evolution=3;
  a.setupDisplay({id:'bastion'},{},{self:{dual:false,parry:0}});const owner={x:0,y:1.6,z:0,yaw:0,pitch:0};
  const finish={rarity:'legendary',base:'#ff5744'},out=[];a.weapon(out,owner,0,finish,true,2);assert(out.length>0);assert(out.every(Number.isFinite));
  const absent=[];a.weapon(absent,owner,1,finish,true,2);assert.equal(absent.length,0);
  a.actor({id:8});const other=[];a.weapon(other,owner,0,finish,true,2);assert.equal(other.length,0);
});
test('A29 shareable recap uses public names, score, accuracy, MVP and highlights',()=>{
  const g=make();g.api.copy({mode:'flags',field:'Ironline Express',score:[3,1],mvp:'Falcon',players:[{id:75,name:'Falcon',team:0,kills:4,deaths:1,hits:3,shots:4,secret:'private-value'}],
    timeline:[{at:2000,text:'Flag returned'}]});
  const out=el(g,'ascRecap');assert(!out.classList.contains('hide'));
  for(const fragment of ['Capture the Flag','3 – 1','MVP Falcon','4 K / 1 D','75%','Flag returned'])assert(out.value.includes(fragment));
  assert(!out.value.includes('private-value'));
});
test('A37 private builder places, rotates, moves, validates routes, saves and plays the design',()=>{
  const g=make(),a=g.api;a.choose(true);a.open();textButton(g,'ascHub','Map Builder Lite').click();assert.equal(el(g,'ascGrid').children.length,81);
  const doEdit=name=>textButton(g,'ascBuilder',name).click();
  doEdit('Place');doEdit('Rotate');assert.equal(a.editor.cells[0].rot,1);doEdit('Pick up');
  a.editor.x=5;a.editor.z=5;doEdit('Move here');assert.deepEqual(plain(a.editor.cells),[{kind:'wall',x:5,z:5,rot:1}]);
  doEdit('Save privately');doEdit('Remove');doEdit('Load');assert.equal(a.editor.cells.length,1);
  assert.throws(()=>a.clean([{x:4,z:8,kind:'crate',rot:0}]));assert.throws(()=>a.clean(Array(65).fill({})));
  assert(!a.route(Array.from({length:9},(_,x)=>({x,z:4}))));
  doEdit('Private test');assert.equal(a.run().kind,'builderlite');
});
test('A44 diagnostics label missing snapshot estimates and jitter, replaying deltas only against their key',()=>{
  const g=make(),a=g.api;const full={id:'m1',t:800,frame:1,rows:[[1,1],[2,2]]};
  a.decode(full);const diff=a.decode({id:'m1',frame:3,t:910,base:1,gone:[2],rows:[[1,5]]});assert.deepEqual(plain(diff.rows),[[1,5]]);
  assert.equal(a.decode(full),null);a.live.jitter=13;a.client.disconnects=2;a.diag();const info=el(g,'ascDiag').textContent;
  assert.match(info,/Jitter 13 ms/);assert.match(info,/estimated snapshot gaps 33%/);assert.match(info,/disconnects 2/);
});
test('A48 accessibility controls apply HUD scale, larger text, motion, team symbols, contrast and captions',()=>{
  const g=make(),a=g.api;a.choose(true);
  for(const [id,v] of [['ascText','130'],['ascHudScale','115']]){const node=el(g,id);node.value=v;node.onchange();}
  for(const id of ['asc-reduced','asc-captions','z3Contrast','z3TeamSymbols']){const node=el(g,id);node.checked=true;node.onchange();}
  assert.equal(a.prefs.text,130);assert.equal(a.prefs.hud,115);assert(a.prefs.captions);assert(el(g,'rxStage').classList.contains('asc-reduced'));assert(el(g,'rxStage').classList.contains('z3-contrast'));
  const stored=JSON.parse(g.local.getItem('zone90v2_rx_asc_prefs'));assert.equal(stored.text,130);
});
test('A49 packed geometry halves retained bytes, uploads on demand and deletes old GPU buffers',t=>{
  const g=make(),a=g.api,source=Float32Array.from({length:90},(_,i)=>i%9<3?i/9:.25),packed=a.pack(source);
  assert.equal(packed.byteLength*2,source.byteLength);let uploaded=[],deleted=0,count=0;
  a.setGL({STATIC_DRAW:1,ARRAY_BUFFER:2,createBuffer:()=>++count,bindBuffer(){},bufferData:(k,data)=>{uploaded=Array.from(data);},deleteBuffer(){deleted++;}});
  const chunks=Array.from({length:15},()=>({packed,buffer:null,used:0}));assert.equal(count,0);
  chunks.forEach((c,i)=>a.load(c,100+i));assert(Math.abs(uploaded[1]-source[1])<.016);a.load(chunks.at(-1),200);assert.equal(count,15);
  a.trim(chunks,300);assert.equal(deleted,3);a.trim(chunks,2000);assert.equal(deleted,15);
  const calls={};a.setGL({isContextLost:()=>false,...Object.fromEntries(['deleteTexture','deleteFramebuffer','deleteProgram','deleteRenderbuffer','deleteBuffer'].map(k=>[k,()=>{calls[k]=(calls[k]||0)+1;}]))});
  a.gpuTargets({scene:1,light:2,sceneFbo:3,lightFbo:4,depth:5,quad:6,bright:{program:7},composite:{program:8}});
  assert.deepEqual(calls,{deleteTexture:2,deleteFramebuffer:2,deleteRenderbuffer:1,deleteBuffer:1,deleteProgram:2});
  t.diagnostic('90 mesh scalars: '+source.byteLength+' bytes before packing, '+packed.byteLength+' retained; 12 resident GPU chunks after eviction.');
});
test('Home reaches ranked, armory and all ten new match types; a touch player sees the interaction control',()=>{
  const g=make(),a=g.api;a.choose(true);a.open();textButton(g,'ascHub','Ranked').click();assert(!el(g,'z2Queue').classList.contains('hide'));
  a.open();textButton(g,'ascHub','Armory').click();assert(!el(g,'v8GunMenu').classList.contains('hide'));
  const modes=el(g,'z2GameMode').options.map(o=>o.value);
  for(const mode of ['payload','search','flags','gunrun','chamber','bounty','hardcore','extraction','race','roulette'])assert(modes.includes(mode),mode);
  a.begin({id:'ui',team:0,mode:'payload',ascRules:{map:'train'},field:{id:'train',half:28,name:'Train',cover:[]},roster:[{id:1,team:0,name:'Pilot'}]});
  assert(el(g,'rxStage').classList.contains('asc-match'));
});
test('Objective and environment meshes contain finite coordinates for every map and mode',async()=>{
  const {makeMatch,snapshot,updateMatch}=await import('../server/overdrive-match.mjs');
  const {ASC_MODES,rulesFor}=await import('../server/ascension-world.mjs');const g=make(),a=g.api;a.choose(false);
  for(const map of ['bastion','train','lab','orbit'])for(const mode of ASC_MODES){
    const rules=rulesFor({map}),m=makeMatch({id:'draw',mode,rules,limit:5,players:[{id:1,team:0,name:'A'},{id:2,team:1,name:'B'}],now:1000});
    updateMatch(m,2200);const s=snapshot(m,1,m.last).asc;m.field.ascOriginal=m.field.cover;
    a.setupDisplay(m.field,rules,s);a.live.match.mode=mode;const out=[];a.render(out,2);
    assert(out.every(Number.isFinite),mode+'/'+map);
  }
});
test('A47 controller axes, triggers, parry and jump reach the multiplayer input stream',async()=>{
  const {makeMatch,snapshot,rulesFor}=await import('../server/overdrive-match.mjs').then(async m=>({...m,...await import('../server/ascension-world.mjs')}));
  const g=make(),a=g.api;a.choose(false);a.actor({id:1,name:'Pilot'});const captured=[];
  const rules=rulesFor({}),roster=[{id:1,name:'Pilot',team:0},{id:2,name:'Other',team:1}];
  const m=makeMatch({id:'pad',mode:'flags',players:roster,limit:3,rules,now:1000});
  a.begin({id:'pad',mode:'flags',team:0,field:m.field,ascRules:rules,roster});a.packet(snapshot(m,1,1000));a.bindSocket({readyState:1,bufferedAmount:0,send:msg=>captured.push(JSON.parse(msg))});
  const buttons=Array.from({length:16},()=>({pressed:false}));for(const n of [0,4,6,7])buttons[n].pressed=true;
  g.ctx.navigator.getGamepads=()=>[{connected:true,axes:[.4,-.8,.5,0],buttons}];
  g.perf(1050);a.pad(1050);a.controls(.05,1.05);
  assert.equal(a.device(),'controller');assert(captured.some(p=>p.type==='z2:tool'&&p.kind==='parry'));
  const input=captured.find(p=>p.type==='z2:input');assert(input);assert(input.f>.7);assert(input.s>.3);assert(input.fire&&input.use&&input.jump);
});
test('legacy seasonal editions open and close on their configured dates through 2031',()=>{
  const g=make(),a=g.api;assert(a.editions.length>=20);assert.equal(Math.max(...a.editions.map(e=>e.year)),2031);
  for(const e of a.editions){a.clock(e.startMs-1);assert.equal(a.seasonOpen(e),false);
    a.clock(e.startMs);assert(a.seasonOpen(e));a.clock(e.endMs);assert.equal(a.seasonOpen(e),false);}
});
test('legacy earned coins, Battle Pass claim and weapon case survive a browser reload',()=>{
  const g=makeHarness({zone90v2_coins:'10000',zone90v2_z1Progress:JSON.stringify({xp:1000})},undefined,null,bridge),a=g.api;a.choose(false);
  a.buyPass();assert.equal(a.tier(),1);assert(a.balance()>10000);
  const balance=a.balance();el(g,'v8GunBtn').click();el(g,'v8GunCases').querySelector('button').click();assert.equal(a.balance(),balance-a.caseCost);assert(a.finishes().length);
  const snapshot={};for(let i=0;i<g.local.length;i++){const key=g.local.key(i);snapshot[key]=g.local.getItem(key);}
  const again=makeHarness(snapshot,undefined,null,bridge).api;assert.equal(again.balance(),a.balance());assert.equal(again.tier(),1);assert.deepEqual(plain(again.finishes()),plain(a.finishes()));
});
test('rejoining the same match accepts frame one from a new socket after a higher old frame',async()=>{
  const {makeMatch,snapshot}=await import('../server/overdrive-match.mjs');
  const g=make(),a=g.api;a.choose(false);a.actor({id:1,name:'Pilot'});
  const roster=[{id:1,name:'Pilot',team:0},{id:2,name:'Wing',team:1}],m=makeMatch({id:'resume',mode:'flags',rules:{},limit:3,players:roster,now:1000});
  const info={id:m.id,team:0,mode:m.mode,field:m.field,roster,ascRules:m.asc.rules};
  a.begin(info);a.packet({...snapshot(m,1,1000),frame:84});assert.equal(a.client.frame,84);
  a.begin(info);a.packet({...snapshot(m,1,1200),frame:1});assert.equal(a.live.snapshot.t,1200);assert.equal(a.client.frame,1);
});
test('A11 paired pistol view draws two finite models and changes pose with the firing hand',()=>{
  const g=make(),a=g.api;a.choose(false);a.setupDisplay({id:'bastion'},{},{self:{dual:true,parry:0}});
  const pose={x:0,y:1.6,z:0,yaw:0,pitch:0},finish={rarity:'common',base:'#887766'};
  const out=[];assert.equal(a.weapon(out,pose,0,finish,true,2),true);assert(out.every(Number.isFinite));assert(out.length>2*36*9);
  const xs=out.filter((_,i)=>i%9===0);assert(Math.min(...xs)<0&&Math.max(...xs)>0);
});
