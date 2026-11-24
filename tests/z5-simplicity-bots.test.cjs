const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function tacticsFixture(){
 const a=html.indexOf('// Z.5 Tactical Intelligence'),b=html.indexOf('function botBehavior(',a);
 assert.ok(a>0&&b>a);
 let shots=0,move=0;
 const player={x:0,z:0,hp:100,alive:true};
 const context={Math,mode:'solo',difficulty:2,pl:player,equippedPet:'none',ARENA_HALF:110,
 getStore:()=> 'veteran',obstacles:[],rx2Covers:[],blocked:()=>false,
 activeMap:()=>({ogClassic:true}),v91EffectiveGraphics:()=>1,
 los:()=>false,rx2SmokeBlocks:()=>false,rx2Facing:()=>true,
 rx2Face:()=>{},slide:(bot,dx,dz)=>{bot.x+=dx;bot.z+=dz;move++},
 rand:(min,max)=>(min+max)/2,clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),
 hurt:()=>{shots++},tracers:[],rx2SoundAt:()=>{},remoteConns:new Map()};
 vm.createContext(context);
 vm.runInContext(html.slice(a,b)+'\n;globalThis.botTactics={enabled:rx5BotTacticsEnabled,cover:rx5BotFindCover,step:rx5BotTacticalStep};',context);
 return {context,player,shots:()=>shots,moves:()=>move};
}
test('Operation Simplicity adds selectable OG futuristic map and offline quick play',()=>{
 assert.match(html,/id:'og-future',name:'OG Futuristic Arena'/);
 assert.match(html,/function z5BuildOGFuture\(\)/);
 assert.match(html,/addObstacle\(0,t\*39,80,1\.8,7,metal\)/);
 assert.match(html,/id="rxSimpleQuick"/);
 assert.match(html,/id="rxSimpleToggle"/);
 assert.match(html,/const pool=MAPS\.filter\(m=>!m\.mysteryOnly/);
 assert.match(html,/chooseMap\(chosen\?\.id\|\|'dunes'\);startGame\('solo'\);gameSeconds=300/);
 assert.match(html,/mainMenu\.rx-simple-active/);
 assert.match(html,/rx-home-layout-v2/);
 assert.match(html,/rxSimpleBotLevel/);
 assert.match(html,/const rx5LowG=.*activeMap\(\)\?\.special==='moon'/,'Moonfall local gravity field exists');
 assert.match(html,/pl\.vy=rx5LowG\?9\.6:6\.6/,'jump velocity responds to low gravity');
});
test('tactical bots search genuine occluding cover positions near themselves',()=>{
 const f=tacticsFixture();f.context.obstacles.push({x:5,z:0,w:4,d:4,h:3});
 const c=f.context.botTactics.cover({x:10,z:0,hp:30},f.player,10);
 assert.ok(c);
 assert.ok(c.x>7&&c.x<12);
 assert.equal(c.z,0);
});
test('tactical enemies investigate last seen positions but never fire through walls',()=>{
 const f=tacticsFixture();const bot={id:5,x:12,z:1,alive:true,hp:100,nextShot:-2,strafedir:1,speed:3,personality:'flanker'};
 assert.equal(f.context.botTactics.enabled(),true);
 f.context.los=()=>true;
 f.context.botTactics.step(bot,f.player,.08,10,true);
 assert.equal(f.shots(),0);
 f.context.los=()=>false;
 f.player.x=20;
 assert.equal(f.context.botTactics.step(bot,f.player,.08,12,false),true);
 assert.equal(bot.rx5Brain.mode,'investigate');
 assert.equal(bot.rx5Brain.goal.x,0,'Bot pursues the last visible position');
 assert.equal(f.shots(),0);
 assert.ok(f.moves()>0);
});
test('tactical enemies require reaction time and current LOS before damage',()=>{
 const f=tacticsFixture();const bot={id:6,x:10,z:0,alive:true,hp:100,nextShot:-2,strafedir:1,speed:3,personality:'rusher'};
 // Force a shot to hit if the bot has visibility and its aim has settled.
 f.context.Math=Object.create(Math);f.context.Math.random=()=>0;
 f.context.los=()=>true;
 f.context.botTactics.step(bot,f.player,.08,10,true);
 assert.equal(f.shots(),0,'No instant shot on first visual contact');
 bot.rx5Brain.mode='flank';bot.rx5Brain.reactionUntil=0;bot.nextShot=-1;
 f.context.los=()=>false;
 f.context.botTactics.step(bot,f.player,.08,10.9,true);
 assert.equal(f.shots(),0,'New cover blocks a shot after the initial visibility check');
 f.context.los=()=>true;f.context.rx2SmokeBlocks=()=>true;
 f.context.botTactics.step(bot,f.player,.08,11,true);
 assert.equal(f.shots(),0,'New smoke blocks the shot');
 f.context.rx2SmokeBlocks=()=>false;
 f.context.botTactics.step(bot,f.player,.08,11.1,true);
 assert.equal(f.shots(),1);
});
test('standard intelligence remains a supported lighter fallback',()=>{
 const f=tacticsFixture();
 vm.runInContext("rx5TacticalMode='standard'",f.context);
 assert.equal(f.context.botTactics.enabled(),false);
});

test('wounded Veteran bots eventually leave cover to peek instead of hiding forever',()=>{
 const f=tacticsFixture(),bot={id:8,x:10,z:0,alive:true,hp:30,nextShot:5,strafedir:1,speed:3,personality:'guardian'};
 f.context.obstacles.push({x:5,z:0,w:4,d:4,h:3});
 f.context.botTactics.step(bot,f.player,.08,10,true);
 assert.ok(['cover','hide'].includes(bot.rx5Brain.mode));
 // Advance the simulation to the chosen hiding point.
 bot.x=bot.rx5Brain.goal.x;bot.z=bot.rx5Brain.goal.z;
 f.context.botTactics.step(bot,f.player,.08,10.3,true);
 assert.equal(bot.rx5Brain.mode,'hide');
 const afterHide=bot.rx5Brain.hideUntil+.05;
 f.context.botTactics.step(bot,f.player,.08,afterHide,true);
 assert.notEqual(bot.rx5Brain.mode,'hide');
});
