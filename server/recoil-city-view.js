// Recoil City uses street coordinates (east, south) and a separate elevation axis.
(() => {
  'use strict';
  const W = () => window.RecoilCityWorld;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(n, hi));
  const tau = Math.PI * 2;
  const renderers = new WeakMap(), panoramas = new WeakMap(), colors = new Map();
  const tiers = {low:{pixels:330000, far:335},standard:{pixels:900000, far:565},high:{pixels:1750000, far:820}};
  const tvSafe=()=>/SMART[- .]?TV|Tizen|Web0S|WebOS|HbbTV|NetCast|Android TV|GoogleTV/i.test(typeof navigator==='undefined'?'':navigator.userAgent||'');
  function color(hex, light=1) {
    const key = hex + light;
    if (colors.has(key)) return colors.get(key);
    const value = parseInt(hex.slice(1),16);
    const rgb = [value>>16,(value>>8)&255,value&255].map(c=>Math.round(Math.min(255,c*light)));
    const c = {rgb:rgb.map(x=>x/255),css:'rgb('+rgb.join(',')+')'};
    colors.set(key,c); return c;
  }
  function mesh() { return {faces:[],x:0,y:0,r:0}; }
  function local(m,x=0,y=0,z=0,a=0) {
    const c=Math.cos(a),s=Math.sin(a);
    const point=(u,v,h)=>[x+u*c-v*s,y+u*s+v*c,z+h];
    function face(points,hex,light=1,uv=null,solid=false) { m.faces.push({p:points.map(p=>point(...p)),c:color(hex,light),uv,solid}); }
    function box(u,v,h,l,w,t,hex) {
      const x0=u-l/2,x1=u+l/2,y0=v-w/2,y1=v+w/2,z1=h+t;
      const v0=[x0,y0,h],v1=[x1,y0,h],v2=[x1,y1,h],v3=[x0,y1,h];
      const t0=[x0,y0,z1],t1=[x1,y0,z1],t2=[x1,y1,z1],t3=[x0,y1,z1];
      face([v0,v1,t1,t0],hex,.78,null,true);face([v1,v2,t2,t1],hex,.9,null,true);
      face([v2,v3,t3,t2],hex,1,null,true);face([v3,v0,t0,t3],hex,.84,null,true);face([t0,t1,t2,t3],hex,1.12,null,true);
    }
    function bar(a,b,r,hex,sides=5) {
      const d=b.map((n,i)=>n-a[i]), len=Math.hypot(...d);
      if (len<.001) return;
      const axis=d.map(n=>n/len), h=Math.hypot(axis[0],axis[1]);
      const u=h>.01?[-axis[1]/h,axis[0]/h,0]:[1,0,0];
      const v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]];
      const ring=Array.from({length:sides},(_,i)=>u.map((n,k)=>r*(n*Math.cos(i*tau/sides)+v[k]*Math.sin(i*tau/sides))));
      const first=ring.map(p=>p.map((n,k)=>n+a[k])),last=ring.map(p=>p.map((n,k)=>n+b[k]));
      for(let i=0;i<sides;i++){const j=(i+1)%sides;face([first[i],first[j],last[j],last[i]],hex,.83+.16*Math.cos(i*tau/sides));}
      face(last,hex,1.04);face(first.reverse(),hex,.78);
    }
    return {point,face,box,bar};
  }
  const signs=['PARCEL HOUSE','COPPER CAFE','SANDLINE CUSTOMS','OLD QUARTER','ORCHID ARCADE','RADIO 88.4','STARLINE CINEMA','NORTH STATION','CANAL RECORDS','JADE MARKET','MARINA THEATER','TIDEWORKS','PIER NINE MOTORS','SOUTH DOCKS','LANTERN CLUB','WEST WHARF'];
  const paints=['#d89d76','#e5ba91','#b8b8a0','#d4b997','#968eaa','#b998a7','#899eac','#a0aeb5','#c1ab83','#a3b8a4','#c8a08d','#b3aca0','#a7a99d','#c0a486','#a0b2a3','#c0ada4'];
  const trims=['#934d37','#38766e','#416c69','#6c5546','#5a496c','#995858','#32666b','#586675'];
  function facadeAtlas() {
    const atlas=document.createElement('canvas');atlas.width=atlas.height=1024;
    const ctx=atlas.getContext('2d');
    signs.forEach((name,i)=>{
      const col=(i%4)*256,row=Math.floor(i/4)*256;
      ctx.save();ctx.translate(col,row);ctx.beginPath();ctx.rect(0,0,256,256);ctx.clip();
      ctx.fillStyle=paints[i];ctx.fillRect(0,0,256,256);
      for(let row=3;row<182;row+=8){
        ctx.fillStyle=i%3===0?'#79524019':'#f6e5c912';ctx.fillRect(0,row,256,1);
        if(i%3===0)for(let b=(row%2)*11;b<256;b+=22)ctx.fillRect(b,row,1,7);
      }
      const floors=i>=4&&i<8?5:3, bays=i%3+4, unit=250/bays, height=170/floors;
      for(let floor=0;floor<floors;floor++){
        const y=15+floor*height;
        ctx.fillStyle='#543e3626';ctx.fillRect(0,y+height-6,256,1.5);
        for(let j=0;j<bays;j++){
          const x=7+j*unit,w=unit*(i%2?.76:.65);
          ctx.fillStyle='#f2d4ad';ctx.fillRect(x-2,y-2,w+4,height*.67+5);
          const glass=ctx.createLinearGradient(0,y,0,y+height*.69);
          glass.addColorStop(0,'#344e59');glass.addColorStop(1,(j+floor+i)%4?'#77979b':'#c7b394');
          ctx.fillStyle=glass;ctx.fillRect(x,y,w,height*.67);
          ctx.fillStyle='#b9c6b522';ctx.beginPath();ctx.moveTo(x+2,y+1);ctx.lineTo(x+w*.45,y+1);ctx.lineTo(x+w*.15,y+height*.64);ctx.lineTo(x+1,y+height*.64);ctx.fill();
          if((floor+j+i)%5===0){ctx.fillStyle='#b9a58d';ctx.fillRect(x,y,w,height*.21);ctx.fillStyle='#7b7264';ctx.fillRect(x,y+height*.21,w,1.4);}
          ctx.fillStyle='#c5b099';ctx.fillRect(x+w*.53,y,2,height*.67);
          if(i%3===1){ctx.fillStyle='#a6a18d';ctx.fillRect(x,y+height*.27,w,1.5);}
          ctx.fillStyle='#38494c';ctx.fillRect(x-2,y+height*.67+1,w+4,2);
        }
      }
      ctx.fillStyle=trims[i%8];ctx.fillRect(0,183,256,24);
      ctx.fillStyle='#f6dfad';ctx.fillRect(0,185,256,1);ctx.fillRect(0,204,256,1);
      ctx.font='bold 14px sans-serif';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(name,128,196,235);
      ctx.fillStyle='#564e45';ctx.fillRect(0,207,256,49);
      for(let j=0;j<6;j++){
        const x=4+j*42;
        const pane=ctx.createLinearGradient(0,208,0,252);pane.addColorStop(0,'#304b54');pane.addColorStop(.6,'#63888b');pane.addColorStop(1,'#38585b');
        ctx.fillStyle=pane;ctx.fillRect(x,209,38,41);ctx.fillStyle='#fff1c32c';
        ctx.beginPath();ctx.moveTo(x+5,210);ctx.lineTo(x+19,210);ctx.lineTo(x+4,239);ctx.lineTo(x,239);ctx.closePath();ctx.fill();
        if(j===2){ctx.fillStyle='#d5bf92';ctx.fillRect(x+28,230,2,6);}
        else if((j+i)%3===0){
          ctx.fillStyle='#d7ba95';ctx.fillRect(x+6,222,12,14);ctx.fillStyle=trims[i%8];ctx.fillRect(x+8,224,8,6);
          ctx.fillStyle='#88735f';ctx.fillRect(x+8,233,7,1);
        }else{
          ctx.fillStyle='#223f4699';ctx.fillRect(x,242,38,6);
          for(let q=0;q<3;q++){ctx.fillStyle=['#baa486','#87968b','#b08468'][(q+j+i)%3];ctx.fillRect(x+5+8*q,239-q%2*2,5,4+q%2*2);}
        }
      }
      ctx.fillStyle='#ac9c87';ctx.fillRect(0,252,256,4);ctx.restore();
    });
    return atlas;
  }
  function tileUV(i,l=0,r=1) {
    const x=(i%4)*256,y=Math.floor(i/4)*256;
    [l,r]=[1-l,1-r];
    return [[x+.8+l*254.4,y+255.2],[x+.8+r*254.4,y+255.2],[x+.8+r*254.4,y+.8],[x+.8+l*254.4,y+.8]];
  }
  // Every expansion district maps to a valid architectural family.
  function a4DistrictStyle(name){
    if(['Neon Heights','Aero Heights','East Business Park','Airport Quarter','Marina East'].includes(name))return 1;
    if(['Canal Ward','East Beach','Coral Coast','Garden Estates','Oasis Gardens','Sunset Farms','New Dawn Peninsula'].includes(name))return 2;
    if(['South Docks','Industrial Park','Sunrise Harbor','Highway Ward','Southern Highway','Dune Speedway'].includes(name))return 3;
    return 0;
  }
  function a4BuildingArchitecture(g,b,h,style,i,rich){
    const {x,y,w,h:t}=b,cx=x+w/2,cy=y+t/2,trim=['#c1a78b','#8fa2a5','#c6b79d','#929e9c'][style];
    // Shallow architectural details; original building footprint remains unchanged.
    for(const yy of [y+.14,y+t-.14]){g.box(cx,yy,h*.18,w*.94,.4,.42,trim);g.box(cx,yy,h*.90,w*.94,.4,.48,trim);}
    for(const xx of [x+.18,x+w-.18])g.box(xx,cy,h*.90,.42,t*.96,.48,trim);
    for(const side of [-1,1]){
      const xx=cx+side*w*.44;
      g.box(xx,y+.12,.2,.55,.38,h*.86,trim);
      g.box(xx,y+t-.12,.2,.55,.38,h*.86,trim);
    }
    g.box(cx,cy,h+1.9,w*.86,t*.86,.18,'#b4b1a3');
    if(rich){
      for(const side of [-1,1]){
        const xx=cx+side*w*.28;
        g.box(xx,cy,h+2.05,Math.min(5,w*.13),Math.min(5,t*.12),1.4,'#68797a');
        for(let j=-1;j<=1;j++)g.box(xx+j*.7,cy,h+3.46,.38,2.6,.1,'#a7b5b1');
      }
      if(style===1){for(const side of [-1,1])g.box(cx+side*w*.30,y+.02,h*.24,.4,.5,h*.61,'#829da1');}
      else if(style===0||style===2){for(const side of [-1,1])g.box(cx+side*w*.25,y-.08,h*.33,Math.min(7,w*.18),.42,.56,'#d4bc98');}
      else g.box(cx,cy,h+2.1,Math.min(w*.3,12),Math.min(t*.25,12),.45,'#647775');
    }
  }
  function building(g,b,i,detail=false,rich=false) {
    const h=W().buildingHeight(b), x=b.x,y=b.y,w=b.w,t=b.h,cx=x+w/2,cy=y+t/2;
    const district=a4DistrictStyle(b.district);
    let tile=district*4+(i%4);
    if(x===173&&y===173)tile=0;
    if(x===252&&y===173)tile=2;
    if(x===252&&y===413)tile=1;
    if(x===972&&y===653)tile=12;
    const corners=[[x,y],[x+w,y],[x+w,y+t],[x,y+t]], shades=[.83,.89,1,.96];
    for(let j=0;j<4;j++){
      const a=corners[j],e=corners[(j+1)%4],length=Math.hypot(e[0]-a[0],e[1]-a[1]),panels=Math.max(1,Math.round(length/55));
      for(let k=0;k<panels;k++){
        const u=k/panels,v=(k+1)/panels,m=[a[0]+(e[0]-a[0])*u,a[1]+(e[1]-a[1])*u],n=[a[0]+(e[0]-a[0])*v,a[1]+(e[1]-a[1])*v];
        g.face([[...m,.1],[...n,.1],[...n,h],[...m,h]],'#ffffff',shades[j],tileUV(tile));
      }
    }
    g.box(cx,cy,h,w+1.8,t+1.8,1.3,'#d9c5a7');g.box(cx,cy,h+1.3,w-2,t-2,.55,'#938e80');
    g.box(cx+w*.13,cy,h+1.8,w*.36,t*.36,4.6,paints[tile]);g.box(cx+w*.13,cy,h+6.4,w*.36+1,t*.36+1,.65,'#a29e91');
    if(detail){for(const side of [-1,1]){g.box(cx+side*w*.34,cy,h+1.85,w*.13,t*.24,1.7,'#8c9996');g.box(cx+side*w*.34,cy,h+3.55,w*.14,t*.25,.25,'#b8c0b3');}g.box(cx,y-.26,0,w*.68,.65,.65,'#b5a38c');for(const d of [-1,1])g.box(cx+d*w*.35,y-.21,0,.55,.55,Math.min(12,h*.3),'#ab9b86');}
    if(detail)a4BuildingArchitecture(g,b,h,district,i,rich);
    // Roofline details and projecting balconies give each district a different street silhouette.
    if(district===1){
      for(let z=13;z<h;z+=15)g.box(cx,cy,z,w+1.5,t+1.5,.62,'#87959a');
      g.bar([cx,cy,h+6],[cx,cy,h+15],.22,'#788187');
    }else if(i%3===0){
      for(const v of [.22,.73]){
        const py=y+v*t;
        g.box(x-1.1,py,h*.51,2.4,Math.min(14,t*.32),.65,'#a38b74');
        g.bar([x-2.25,py-4,h*.51+2.15],[x-2.25,py+4,h*.51+2.15],.16,'#5c625c',4);
        for(const d of [-3.8,0,3.8])g.bar([x-2.25,py+d,h*.51+.6],[x-2.25,py+d,h*.51+2.15],.12,'#59605a',4);
      }
    }
    if(i%4===0){
      g.bar([cx-7,cy+4,h+2],[cx-7,cy+4,h+10],2,'#796d5b');
      g.bar([cx-7,cy+4,h+9],[cx-7,cy+4,h+16],5.3,'#958568',8);
    }
    if(i%3!==2){
      const ht=Math.max(5,h*.19), aw=trims[tile%8];
      g.face([[x,y,ht+1.6],[x+w,y,ht+1.6],[x+w,y-3.4,ht],[x,y-3.4,ht]],aw,1.1);
      g.face([[x,y-3.4,ht],[x+w,y-3.4,ht],[x+w,y-3.4,ht-1],[x,y-3.4,ht-1]],aw);
    }
  }
  function a4PalmCrown(g,x,y,h,rich){
    // Curved, tapered trunk and arched leaflets instead of flat rectangular leaves.
    const top=[x+1.2,y,h];
    let prev=[x,y,.2];
    for(let j=1;j<=4;j++){const t=j/4,next=[x+1.2*t*t,y+.28*Math.sin(t*Math.PI),h*t];g.bar(prev,next,.93-.09*j,'#9d7955',6);prev=next;}
    for(let j=1;j<= (rich?8:4);j++){const t=j/(rich?9:5),z=h*t;g.bar([x+1.2*t*t,y+.28*Math.sin(t*Math.PI),z],[x+1.2*t*t,y+.28*Math.sin(t*Math.PI),z+.16],.99-.36*t,'#7f6449',6);}
    g.bar([top[0],y,h-.5],[top[0],y,h+.65],1.2,'#657748',7);
    const n=rich?10:8;
    for(let i=0;i<n;i++){
      const a=i*tau/n+x*.25,dx=Math.cos(a),dy=Math.sin(a),l=6.6+i%3*1.2,drop=i%2?2.0:3.7;
      const at=t=>[top[0]+dx*l*t,y+dy*l*t,h+Math.sin(t*Math.PI)*2.7-drop*t*t];
      const count=rich?5:3;
      for(let j=0;j<count;j++){
        const t=j/count,u=(j+1)/count,p=at(t),q=at(u),w=Math.sin((t+u)*Math.PI*.5)*1.45;
        for(const sign of [-1,1]){
          const tip=[(p[0]+q[0])*.5-dy*w*sign,(p[1]+q[1])*.5+dx*w*sign,(p[2]+q[2])*.5-.6];
          g.face([p,tip,q],sign===1?'#688e4e':'#3e7050');
        }
      }
    }
  }
  function palm(g,x,y,h,detail=false,rich=false) {
    if(detail){a4PalmCrown(g,x,y,h,rich);return;}
    g.bar([x,y,.2],[x+1.2,y,h],.85,'#97795b',5);
    if(detail){for(let j=1;j<5;j++){const z=h*j/5;g.bar([x+1.2*j/5,y,z],[x+1.2*j/5,y,z+.24],.91,'#80694e',5);}g.bar([x+1.2,y,h-.4],[x+1.2,y,h+.6],1.1,'#667b4c',6);}
    for(let i=0;i<8;i++){
      const a=i*tau/8+x*.25,l=6.5+(i%3)*1.3,dx=Math.cos(a),dy=Math.sin(a);
      const end=[x+1.2+l*dx,y+l*dy,h-.8-i%3],base=[x+1.2,y,h];
      const middle=[x+1.2+dx*l*.52,y+dy*l*.52,h+2.1];
      g.face([base,[middle[0]-dy*1.4,middle[1]+dx*1.4,middle[2]],end,middle],i%2?'#4e826a':'#3a705c');
      g.face([middle,end,[middle[0]+dy*1.4,middle[1]-dx*1.4,middle[2]-.3],base],i%2?'#709260':'#598867');
    }
  }
  function lamp(g,x,y,angle,detail=false) {
    const dx=Math.cos(angle)*4,dy=Math.sin(angle)*4;
    g.bar([x,y,0],[x,y,16],.4,'#505e62',4);g.bar([x,y,15.9],[x+dx,y+dy,17],.32,'#657173',4);
    g.box(x+dx,y+dy,16.4,2.2,1.5,.65,'#ead5a8');
    if(detail){g.box(x,y,0,1.6,1.6,.6,'#747c78');g.bar([x,y,.6],[x,y,2.4],.61,'#59676a',6);g.box(x+dx,y+dy,17,2.5,1.75,.23,'#647476');}
  }
  function rect(g,x,y,w,h,z,c){g.face([[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],c);}
  function scenery(map,region) {
    const detail=!tvSafe()&&region?.quality==='high';
    const nearbyDetail=(x,y)=>!tvSafe()&&!!region&&region.quality!=='low'&&Math.abs(x-region.x)<=310&&Math.abs(y-region.y)<=310;
    const close=(x,y,r=0)=>!region||Math.abs(x-region.x)<=region.radius+r&&Math.abs(y-region.y)<=region.radius+r;
    const groups=[];
    function chunk(x,y,r,ground=false){const m=mesh();Object.assign(m,{x,y,r,ground});groups.push(m);return local(m);}
    // Street tiles keep the depth range and cost of the software renderer bounded.
    for(let y=0;y<map.height;y+=60)for(let x=0;x<map.width;x+=60){
      if(!close(x+30,y+30,47))continue;
      const g=chunk(x+30,y+30,47,true);
      rect(g,x,y,60,60,-.37,'#cbbda7');
      for(const rx of map.roadsX)if(rx+37>x&&rx-37<x+60){
        const l=Math.max(x,rx-37),r=Math.min(x+60,rx+37);rect(g,l,y,r-l,60,-.17,'#59616a');
      }
      for(const ry of map.roadsY)if(ry+37>y&&ry-37<y+60){
        const t=Math.max(y,ry-37),b=Math.min(y+60,ry+37);rect(g,x,t,60,b-t,-.16,'#59616a');
      }
    }
    for(const x of map.roadsX)for(let y=5;y<map.height;y+=20){
      if(!close(x,y,45))continue;
      if(map.roadsY.some(ry=>Math.abs(y+5-ry)<43))continue;
      const g=chunk(x,y,45,true);rect(g,x-.47,y,.94,9,-.09,'#e2bd7c');
      for(const d of [-34.8,34.4])rect(g,x+d,y,.4,19.6,-.09,'#d2cbb9');
    }
    for(const y of map.roadsY)for(let x=5;x<map.width;x+=20){
      if(!close(x,y,45))continue;
      if(map.roadsX.some(rx=>Math.abs(x+5-rx)<43))continue;
      const g=chunk(x,y,45,true);rect(g,x,y-.47,9,.94,-.09,'#e2bd7c');
      for(const d of [-34.8,34.4])rect(g,x,y+d,19.6,.4,-.09,'#d2cbb9');
    }
    for(const x of map.roadsX)for(const y of map.roadsY){
      if(!close(x,y,120))continue;
      const g=chunk(x,y,62,true);
      for(let i=-29;i<=30;i+=6)for(const side of [-1,1]){
        rect(g,x+i,y+side*35-2.5,2.8,5,-.06,'#d4cfc0');rect(g,x+side*35-2.5,y+i,5,2.8,-.06,'#d4cfc0');
      }
      const near=nearbyDetail(x,y),prop=chunk(x,y,78);lamp(prop,x+41,y-41,2,near);palm(prop,x-45,y-49,22+(x%3),near,detail);
      if(x<map.width-80 && y<map.height-80){
        const street=chunk(x+83,y+43,61);palm(street,x+89,y+41,17+(y%4),near,detail);
        const bench=local(groups.at(-1),x+61,y+43);
        bench.box(0,0,1.4,6,1.65,.6,'#866748');bench.box(0,.78,2.05,6,.32,1.25,'#a0835c');
        for(const d of [-2.2,2.2])bench.box(d,0,0,.55,1.4,1.4,'#59655f');if(detail){for(const z of [1.65,2.2])bench.box(0,.83,z,5.7,.15,.14,'#d1b187');for(const d of [-2.35,2.35])bench.bar([d,0,1.8],[d,.8,2.65],.12,'#55665d',4);}
        street.bar([x+72,y+44,0],[x+72,y+44,2.6],1.05,'#56796c',6);
        if(near){street.bar([x+72,y+44,2.6],[x+72,y+44,2.9],1.15,'#384d4b',8);street.box(x+72,y+44,2.93,.7,.28,.12,'#83938b');for(const off of [-2,2])bench.box(off,0,2.1,.22,1.75,.2,'#465550');}
        street.bar([x+40.5,y+40.5,0],[x+40.5,y+40.5,12],.3,'#5b6866',4);
        street.box(x+40.5,y+40.5,9.3,1.35,1.35,3,'#485451');
        street.box(x+39.78,y+40.5,9.7,.15,.8,.6,'#8fb488');
      }
    }
    map.blocks.forEach((b,i)=>{
      if(!close(b.x+b.w/2,b.y+b.h/2,Math.hypot(b.w,b.h)/2+30))return;
      const g=chunk(b.x+b.w/2,b.y+b.h/2,Math.hypot(b.w,b.h)/2+30);
      if(b.kind==='park'){
        rect(g,b.x,b.y,b.w,b.h,.01,'#82a778');
        rect(g,b.x+b.w*.45,b.y,b.w*.12,b.h,.06,'#ceb993');
        rect(g,b.x,b.y+b.h*.45,b.w,b.h*.12,.07,'#ceb993');
        const near=nearbyDetail(b.x+b.w/2,b.y+b.h/2);
        for(let j=0;j<6;j++)palm(g,b.x+12+(j%3)*b.w*.36,b.y+15+Math.floor(j/3)*b.h*.67,19+j%3*3,near,detail);
        if(near){const cx=b.x+b.w*.22,cy=b.y+b.h*.24;g.bar([cx,cy,.08],[cx,cy,.68],5.2,'#b4ac91',12);g.bar([cx,cy,.69],[cx,cy,.78],4.45,'#6fa2a0',12);g.bar([cx,cy,.8],[cx,cy,2.7],.45,'#b9b5a2',6);for(const sign of [-1,1])g.box(b.x+b.w*.55,b.y+b.h*.37+sign*4,0,5.5,.45,.5,'#c4b096');}
        g.box(b.x+b.w*.55,b.y+b.h*.37,1.4,6,2,.8,'#846954');
      }else building(g,b,i,nearbyDetail(b.x+b.w/2,b.y+b.h/2),detail);
    });
    for(const s of [map.garage,...map.shops]){
      if(!close(s.x,s.y,60))continue;
      const g=chunk(s.x,s.y,37), repair=s.id==='repair', tile=s.id==='cafe'?1:repair?12:2;
      const y=repair?791:s.id==='cafe'?410:s===map.garage?171:s.y+11, d=repair?1:-1, x=s.x;
      g.box(x,y,0,22,2.45,12.5,'#9f967f');
      const front=y+d*1.3, a=repair?x+11:x-11, b=repair?x-11:x+11;
      const u=tileUV(tile),row=Math.floor(tile/4)*256;
      const strip=[[u[0][0],row+205],[u[1][0],row+205],[u[2][0],row+183],[u[3][0],row+183]];
      g.face([[a,front,9.1],[b,front,9.1],[b,front,12],[a,front,12]],'#ffffff',1,strip);
      for(let i=0;i<9;i++){
        const x0=x-11+i*22/9,x1=x0+22/9;
        g.face([[x0,front,9],[x1,front,9],[x1,front+d*3.3,8.2],[x0,front+d*3.3,8.2]],i%2?'#e2c89e':trims[tile%8]);
      }
      g.box(x,front+d*.15,0,16,.5,7.7,s.id==='cafe'?'#466668':'#737c76');
      for(let i=1;i<7;i++)g.box(x,front+d*.46,i,15,.12,.1,'#a3a69a');if(detail){for(const side of [-1,1]){g.box(x+side*9,front+d*.65,0,.48,.65,8.8,'#d9c6a5');g.box(x+side*8.2,front+d*.8,7.6,1.2,.6,.35,'#edc98a');}}
      if(s.id==='cafe'){
        g.box(x,front+d,3.5,14,1.6,.7,'#b8835c');g.box(x+3,front+d,4.2,2.1,1.3,1.55,'#bdba99');
      }
      if(nearbyDetail(x,y)){for(const sign of [-1,1]){g.box(x+sign*7,front+d*.66,1.0,.24,.48,6.6,'#d2c2a6');g.box(x+sign*9.5,front+d*2.5,0,1.8,1.8,.6,'#927b63');g.bar([x+sign*9.5,front+d*2.5,.6],[x+sign*9.5,front+d*2.5,2],.64,'#55735b',6);}g.box(x,front+d*.85,7.85,16,.46,.28,'#d1b78c');}
      g.bar([x-12,front+d*2,0],[x-12,front+d*2,7],.45,'#526761',5);
      g.box(x-12,front+d*2,6.8,2.45,1.12,2.1,'#388574');
    }
    for(const s of map.secrets){
      if(!close(s.x,s.y,19))continue;
      const g=chunk(s.x,s.y,19),x=s.x,y=s.y;
      if(s.kind==='radio'){
        g.box(x+4,y,0,5.4,2.5,3.5,'#82694e');g.box(x+4,y,3.5,5.8,3,.33,'#c8a173');
        g.bar([x+4,y,3.85],[x+4,y,4.07],.98,'#37464b',8);g.box(x+5.9,y,3.86,.75,1.2,.55,'#a8b4a1');
        for(const side of [-1,1]){
          g.box(x+6,y+side*3.4,0,2,1.9,4.5,'#4b4b49');
          g.bar([x+4.9,y+side*3.4,1.8],[x+4.86,y+side*3.4,1.8],.76,'#b89971',8);
        }
        g.bar([x+7,y+4,0],[x+7,y+4,15],.25,'#8c9385');
        for(const h of [11,13,15])g.bar([x+5,y+4,h],[x+9,y+4,h],.16,'#918c77');
      }else if(s.kind==='lantern'){
        for(const side of [-1,1])g.box(x+side*4,y,0,.7,.9,10.4,'#856e51');
        g.box(x,y,9.7,10,1.3,.9,'#936b4d');g.bar([x,y,9.9],[x,y,8.3],.13,'#635e4d');
        g.bar([x,y,5],[x,y,8.2],1.45,'#7dc2a5',8);g.bar([x,y,4.7],[x,y,5.1],1.58,'#b39565',8);
        g.bar([x,y,4],[x,y,4.8],.2,'#d3a453');
      }else{
        g.box(x+4,y,0,3.6,3.5,1,'#a29476');g.bar([x+4,y,1],[x+4,y,6.3],.62,'#72867e',6);
        g.bar([x+4,y-.9,8.8],[x+4,y+.9,8.8],3.2,'#a38960',12);
        for(const d of [-1,1]){
          g.bar([x+4,y+d*.93,8.8],[x+4,y+d,8.8],2.72,'#d7ccab',12);
          g.bar([x+4,y+d*1.12,8.8],[x+2.6,y+d*1.12,10.2],.15,'#4c685f',4);
          g.bar([x+4,y+d*1.12,8.8],[x+5,y+d*1.12,9.1],.19,'#4c685f',4);
        }
      }
    }
    return groups;
  }
  function shadow(g,l,w) {
    const pts=[];for(let i=0;i<10;i++)pts.push([Math.cos(i*tau/10)*l,Math.sin(i*tau/10)*w,.09]);
    g.face(pts,'#555855');
  }
  function heldWeapon(g,x,y,z,id){
    const length={ar:3.3,shot:3.9,sniper:4.8,smg:2.3}[id]||3.3;
    g.box(x+.4,y,z,1.7,.53,.58,'#374549');g.box(x-.63,y,z-.02,.85,.44,.41,'#53615f');
    g.box(x+length*.58,y,z+.1,length*.7,.26,.27,'#59696b');
    g.box(x+.16,y,z-.5,.47,.38,.65,'#414b4a');
    if(id==='sniper')g.box(x+.55,y,z+.6,.95,.43,.31,'#526064');
    else g.box(x+1.12,y,z+.54,.22,.19,.19,'#8d9892');
  }
  const a3CityMotion=new WeakMap();
  function a3CityStride(p,time,enabled){
    const target=p.motion==='walking'||p.motion==='sprinting'?1:0;
    if(!enabled)return target*Math.sin(p.phase||0);
    let state=a3CityMotion.get(p);if(!state||time<state.at||time-state.at>.3){state={at:time,blend:target,swing:target*Math.sin(p.phase||0)};a3CityMotion.set(p,state);return state.swing;}
    const dt=time-state.at;if(dt<=0)return state.swing;
    state.blend+=(target-state.blend)*(1-Math.exp(-dt*12));
    if(target)state.swing=Math.sin(p.phase||0)*state.blend;else state.swing*=Math.exp(-dt*15);
    state.at=time;return state.swing;
  }
  function a3CityVisuals(m){return !tvSafe()&&m.detail!=='low'&&!(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)&&!document.body?.classList?.contains('rx5-reduce-motion');}
  function actor(m,p,hero,time,weaponId) {
    const base=local(m,p.x,p.y,0,p.angle);shadow(base,hero?2.8:2.15,hero?2:1.65);
    const shared=window.RecoilCityCharacter;
    if(shared&&!tvSafe()){
      const data=shared.emit(hero?{...p,phase:a3CityStride(p,time,a3CityVisuals(m)),a4Hero:true,color:'#327d79',pants:'#354256'}:p,time,m.detail||'low',[]);
      for(let i=0;i<data.length;i+=27){
        const rgb=data.slice(i+3,i+6),shade=.70+.30*Math.max(0,data[i+7]),c={rgb:rgb.map(v=>Math.min(1,v*shade)),css:'rgb('+rgb.map(v=>Math.round(Math.min(1,v*shade)*255)).join(',')+')'};
        const points=[];for(let j=0;j<27;j+=9)points.push([p.x-data[i+j+2],p.y+data[i+j],(p.z||0)+data[i+j+1]]);
        m.faces.push({p:points,c,solid:false,uv:null});
      }
      if(p.hp>0&&!(p.stunUntil>time)&&(p.mood==='defend'||(p.aimUntil||0)>time)){const g=local(m,p.x,p.y,p.z||0,p.angle);heldWeapon(g,3.6,1,9.38,weaponId);}
      return;
    }
    const named=hero&&p.character?shared?.cast?.[p.character]:null;
    const g=local(m,p.x,p.y,p.z||0,p.angle), coat=named?.color||(hero?'#327d79':p.color), pants=named?.pants||(hero?'#354256':'#474956');
    if(p.hp<=0||p.stunUntil>time){g.box(0,0,.4,5,2.8,2.2,coat);g.box(3.6,0,.5,2.3,2,1.7,'#bc8a69');for(const side of [-1,1]){g.box(-3.8,side*.9,.35,3.6,1,.85,pants);g.box(.1,side*2,.45,2.8,.8,.8,coat);}return;}
    const jumping=p.motion==='jumping', sprint=p.motion==='sprinting'||p.mood==='flee', aiming=(p.aimUntil||0)>time||p.mood==='defend';
    const swing=hero?(p.motion==='idle'?0:Math.sin(p.phase)):p.phase;
    const stride=jumping?1.7:swing*(sprint?2.3:1.45),bob=jumping?0:Math.abs(swing)*.34;
    for(const side of [-1,1]){
      const hip=[0,side*.84,5.8+bob], knee=[stride*side*.65+.3,side*.88,3.2+bob], foot=[stride*side,side*.9,jumping?1.4+(side+1)*.6:.72+Math.max(0,-stride*side)*.34];
      g.bar(hip,knee,.84,pants);g.bar(knee,foot,.66,pants);g.box(foot[0]+.34,foot[1],foot[2]-.52,2,1.4,.78,'#d6c6a6');
    }
    g.box(0,0,5.5+bob,2.45,3.3,1.15,pants);
    g.box(sprint?.35:0,0,6.48+bob,2.75,4,3.8,coat);
    g.box(.1,0,10.26+bob,1.7,1.8,.82,'#bf8966');
    g.box(.15,0,10.8+bob,2.6,2.48,2.48,'#c4926d');
    g.box(-.08,0,12.52+bob,2.86,2.64,1.06,hero?'#342b29':'#534339');
    g.box(-1.14,0,11.52+bob,.58,2.41,1.22,hero?'#48372c':'#664f3c');
    if(!hero&&p.id%3===1)g.box(-1.32,0,10+bob,.74,1.6,2.6,'#574332');
    if(hero){
      g.box(-1.41,0,6.98+bob,1.06,2.74,3.1,'#2f4d4c');
      g.box(-1.99,0,7.15+bob,.24,2.32,1.1,'#3d5b55');
      g.box(-1.98,-.57,8.76+bob,.1,.54,.65,'#e0c28b');
      for(const side of [-1,1])g.bar([-.6,side*1.35,10.07+bob],[-1.58,side*1.36,7.7+bob],.23,'#b99d72',4);
      g.box(0,0,6.44+bob,2.62,3.49,.32,'#635844');g.box(-1.82,0,8.6+bob,.15,2.37,.42,'#edbb68');
      g.box(-1.36,0,9.94+bob,.35,3.6,.45,'#e9bb71');g.box(.95,0,12.52+bob,1.8,2.75,.33,'#433832');
    }
    for(const side of [-1,1]){
      const arm=jumping?1.7:-stride*side*.64;
      const shoulder=[.02,side*2.12,9.8+bob],elbow=[aiming?1.4:arm*.52,side*2.34,8.05+bob];
      const hand=[aiming?3.6:arm+.2,side*(aiming?.93:2.27),aiming?9.5+bob:6.88+bob+(sprint?.55:0)];
      g.bar(shoulder,elbow,.74,coat);g.bar(elbow,hand,.52,'#c59370');
    }
    if(aiming)heldWeapon(g,3.6,1,9.38+bob,weaponId);
  }
  function a4CityVehicleDetail(g,v,inside,extra){if(inside){g.box(4.6,.3,5.45,1.0,1.75,.34,'#202a31');g.box(4.59,.3,5.80,.78,1.48,.06,'#6e9b99');g.box(3.95,2.2,4.8,1.65,2.3,.27,'#526167');for(const side of [-1,1])g.box(4.8,side*3.7,5.43,.55,.85,.24,'#91a2a0');return;}
 for(const side of [-1,1]){g.box(10.8,side*2.15,3.02,.22,1.4,.19,'#aeb9b7');g.box(-10.88,side*3.85,2.72,.20,.85,.24,'#565e61');g.box(-.8,side*5.19,4.12,.95,.18,.14,'#c1c7bd');if(extra)for(const x of [-6.6,6.8]){const yy=side*5.69,roll=v.wheel||0;for(let i=0;i<3;i++){const a=roll+i*Math.PI/3;g.bar([x-.78*Math.cos(a),yy,2.35-.78*Math.sin(a)],[x+.78*Math.cos(a),yy,2.35+.78*Math.sin(a)],.085,'#b2b6ad',4);}}}
 g.box(10.98,0,3.16,.18,2.8,.41,'#303a3c');if(v.kind==='patrol'||v.filmPolice){for(const side of [-1,1]){g.box(-1.4,side*5.22,3.75,3.0,.12,.42,'#d0d7d5');g.box(2.4,side*5.22,3.75,2.8,.12,.42,'#55778b');}g.bar([-3.5,0,8.1],[-3.5,0,9.3],.09,'#384c56',4);}
 }
  function a4CarProfile(v){
    const id=String(v.id||'');
    if(id==='a1-trail'||id==='tide'||id==='cobalt')return {roof:8.5,front:2.15,rear:-5.0,half:4.05,kind:'utility'};
    if(id==='a1-sprint'||id==='a1-nova'||id==='meteor')return {roof:7.25,front:1.5,rear:-3.8,half:3.62,kind:'sport'};
    return {roof:8.05,front:1.15,rear:-4.1,half:3.75,kind:'sedan'};
  }
  function a4CarShell(g,v,body){
    const low=v.hp<45?.38:.78;
    const rings=[[-10.9,4.32,2.85,4.66],[-8.7,5.1,2.62,4.57+low],[-3,5.12,2.62,4.69],[3.1,5.12,2.62,4.68],[8.6,5.0,2.62,4.62+low],[10.95,4.38,2.85,4.62]];
    const ring=([x,w,z,h])=>[[x,-w*.90,z],[x,-w,z+.38],[x,-w*.92,h],[x,w*.92,h],[x,w,z+.38],[x,w*.90,z]];
    const rows=rings.map(ring);
    for(let i=1;i<rows.length;i++)for(let j=0;j<5;j++)g.face([rows[i-1][j],rows[i][j],rows[i][j+1],rows[i-1][j+1]],body,[.81,.95,1.12,.94,.81][j]);
    g.face(rows[0],body,.82);g.face(rows.at(-1),body,1.02);
  }
  function a4VehicleFinish(g,v,body,profile,rich){
    for(const side of [-1,1]){
      const y=side*5.12;
      for(const x of [-6.6,6.8]){
        // Wheel arch trim is drawn as a shallow segmented curve above the tire.
        for(let j=0;j<4;j++){const a=j*Math.PI/4,b=(j+1)*Math.PI/4;g.bar([x+2.23*Math.cos(a),y,2.35+2.23*Math.sin(a)],[x+2.23*Math.cos(b),y,2.35+2.23*Math.sin(b)],.095,body,4);}
      }
      g.box(-2.8,y,3.55,.11,.10,.75,'#384344');
      g.box(2.1,y,3.55,.11,.10,.75,'#384344');
      g.box(-3.7,y,4.30,.9,.13,.15,'#c2c9c3');
      g.box(10.78,side*3.4,3.92,.18,1.65,.21,'#f8e7b7');
      g.box(-10.94,side*3.4,3.77,.13,1.62,.18,'#f5a27c');
      if(rich){g.box(1.35,side*5.0,5.12,1.15,.78,.36,'#41565b');g.box(-10.78,side*2.8,2.36,.30,.52,.28,'#454f51');}
    }
    g.box(10.98,0,3.0,.12,3.7,.64,'#2e3a3e');
    for(const z of [3.16,3.41])g.box(11.05,0,z,.06,3.55,.08,'#9aa7a4');
    if(profile.kind==='sport')g.box(-9.1,0,5.43,1.18,8.1,.24,body);
    if(profile.kind==='utility'){for(const side of [-1,1])g.bar([-4.5,side*3.32,profile.roof+.25],[1.7,side*3.32,profile.roof+.25],.13,'#495859',5);}
  }
  function a4Cockpit(g,v,rich){
    // Screen, vents, dashboard seams, center console and footwell stay below the sightline.
    g.box(4.43,0,5.54,.65,1.55,.28,'#303b40');
    g.box(4.35,0,5.83,.44,1.30,.045,'#6b9697');
    for(const side of [-1,1]){
      for(let i=0;i<3;i++)g.box(4.54,side*(2.72+i*.21),5.64,.22,.10,.11,'#7a8d8d');
      g.box(1.45,side*4.5,4.0,4.6,.43,.76,'#3b4c50');
      g.box(1.45,side*4.23,4.81,1.7,.15,.16,'#849493');
    }
    g.box(1.4,0,3.9,3.3,1.08,1.02,'#48575a');g.bar([2,0,4.93],[2.1,0,5.4],.13,'#909a95',5);
    if(rich){g.box(3.84,-1.85,5.43,.30,1.58,.34,'#263438');for(const side of [-1,1])g.bar([3.64,-1.85+side*.4,5.64],[3.6,-1.85+side*.4,5.75],.18,'#a9bfab',8);}
  }
  function automobile(m,v,driving,time,inside,nearby=true) {
    const g=local(m,v.x,v.y,0,v.angle), body=v.hp<=0?'#494947':v.color;const detail=!tvSafe()&&m.detail!=='low',rich=detail&&nearby,profile=a4CarProfile(v);
    if(inside){
      g.box(5,-.3,4.35,2.4,9.5,1.1,'#394449');g.box(4.65,-1.8,5.44,.9,2.7,.65,'#293b40');
      g.box(7.6,0,4.7,4.9,9.5,.44,body);
      for(const side of [-1,1])g.bar([5.6,side*4.62,5.1],[2.1,side*4.55,9.55],.21,'#596569',5);
      const y=-1.85,z=6.02,roll=v.steer*.92,r=.73;
      const rim=Array.from({length:12},(_,i)=>[3.35,y+r*Math.cos(i*tau/12),z+r*Math.sin(i*tau/12)]);
      rim.forEach((p,i)=>g.bar(p,rim[(i+1)%rim.length],.095,'#293235',5));
      for(const a of [roll,roll+Math.PI,roll-1.6])g.bar([3.35,y,z],[3.35,y+r*Math.cos(a),z+r*Math.sin(a)],.065,'#78837f',4);
      g.box(3.28,y,z-.16,.18,.48,.32,'#414e4e');
      for(const side of [-1,1])g.bar([1.4,y+side*1.1,4.95],[3.25,y+side*r*Math.cos(roll),z+side*r*Math.sin(roll)],.21,'#bc8b6e');
      if(detail){a4CityVehicleDetail(g,v,true,m.detail==='high');a4Cockpit(g,v,m.detail==='high');}return;
    }
    shadow(g,11.7,5.45);
    g.box(0,0,1.55,21,9.7,1.75,'#303a3c');
    if(rich)a4CarShell(g,v,body);else{g.box(.1,0,2.8,21.8,10.2,1.9,body);g.box(7.1,0,4.62,7.4,9.9,v.hp<45?.38:.78,body);g.box(-8,0,4.57,5.4,9.95,.74,body);}
    const shape=rich?profile:{roof:8.05,front:1.15,rear:-4.1,half:3.75};
    const a=[-6,-4.7,4.65],b=[3.5,-4.7,4.65],c=[shape.front,-shape.half,shape.roof],d=[shape.rear,-shape.half,shape.roof],mirror=p=>[p[0],-p[1],p[2]];
    g.face([a,b,c,d],'#46666d');g.face([mirror(a),mirror(b),mirror(c),mirror(d)],'#739096');
    g.face([b,mirror(b),mirror(c),c],'#86a7aa');g.face([a,mirror(a),mirror(d),d],'#4e747b');
    for(const fraction of [.28,.49,.70]){
      const xx=a[0]+(d[0]-a[0])*fraction-.02, zz=a[2]+(d[2]-a[2])*fraction, yy=4.5-fraction*.93;
      g.bar([xx,-yy,zz],[xx,yy,zz],.035,'#799b9a',3);
    }
    g.face([d,c,mirror(c),mirror(d)],body,1.12);
    for(const side of [-1,1]){
      for(const x of [-6.6,6.8]){
        const y=side*5.05,offset=x>0?v.steer*.5:0;
        g.bar([x-offset,y-side*.51,2.35],[x+offset,y+side*.51,2.35],2.17,'#30373a',8);
        g.bar([x+offset,y+side*.52,2.35],[x+offset,y+side*.56,2.35],1.07,'#a2a8a1',6);
        const co=Math.cos(v.wheel||0),si=Math.sin(v.wheel||0);
        g.bar([x+offset-co*.82,y+side*.58,2.35-si*.82],[x+offset+co*.82,y+side*.58,2.35+si*.82],.17,'#555e62',4);
      }
      g.bar([-1.5,side*4.67,4.7],[-1.7,side*shape.half,shape.roof-.1],.22,body,4);
      g.box(.5,side*5.13,4.2,1,.2,.25,'#d1d1be');g.box(-10.86,side*3.44,3.6,.38,2.45,.82,'#e56a52');
      g.box(10.92,side*3.45,3.76,.25,2.45,.67,'#fff2b2');
    }
    g.box(-11.06,0,2.65,.17,8.25,.33,'#596260');
    g.box(-11.18,0,3.22,.15,2.75,.76,'#e9d5a5');g.box(-11.26,0,3.47,.05,1.85,.12,'#524f47');
    g.box(-11.11,0,4.1,.15,1,.22,'#b3bbac');
    for(const side of [-1,1]){
      g.box(1.7,side*5.16,5.45,1.45,.94,.62,body);
      g.box(-.4,side*5.15,3.3,17,.12,.18,'#808882');
      g.bar([3.4,side*4.7,4.7],[shape.front+.03,side*(shape.half+.03),shape.roof-.03],.21,body,4);
    }
    if(detail)a4CityVehicleDetail(g,v,false,m.detail==='high'&&driving);
    if(rich)a4VehicleFinish(g,v,body,profile,m.detail==='high'&&driving);
    if(v.kind==='patrol'||v.filmPolice){
      g.box(-1.6,0,8.16,1.45,4.6,.37,'#303844');
      for(const side of [-1,1])g.box(-1.6,side*1.16,8.5,1.3,2,.52,Math.sin(time*12)*side>0?'#fc8064':'#679bc9');
    }
    if(driving||v.kind==='traffic'){
      const yy=-4.49;
      // A tinted silhouette in the near window follows the driver's steering.
      g.face([[-.7,yy,5.3],[1.35,yy,5.3],[.85,yy+.2,6.42],[-.45,yy+.2,6.55]],'#3e5b5b');
      g.face([[-.44,yy+.23,6.5],[.43,yy+.23,6.5],[.54,yy+.43,7.27],[-.51,yy+.43,7.35]],'#7b8580');
      g.bar([.6,yy,5.92],[1.8,yy+.09,6.02+v.steer*.3],.17,'#6e817c',4);
      g.box(-.25,-1.9,5.8,1.4,1.4,1.4,'#bc997d');
      if(driving)g.bar([.3,-2,5.5],[1.6,-1.9+v.steer*.5,6],.32,'#bb9678');
    }
    if(v.hp===0 && time-v.destroyedAt < .55){
      const t=(time-v.destroyedAt)/.55;
      for(let i=0;i<7;i++){
        const a=i*tau/7,r=2+t*6,sz=(1-t)*3+.2;
        g.box(4+Math.cos(a)*r,Math.sin(a)*r,3+t*(5+i%3*2),sz,sz,sz*1.4,i%2?'#f3b955':'#d77a4e');
      }
    }
    if(v.hp<45){
      for(let i=0;i<3;i++){const t=(time*.72+i/3)%1;g.box(6-t*3,Math.sin(t*4+i)*.7,5+t*7,1.6+t,1.6+t,1.4+t,v.hp>0?'#9c978b':'#686964');}
    }
  }
  function a4InteriorDetails(g,s,rich){
    const wood='#92755b',fabric='#64827b',metal='#647479';
    // Wall-mounted and perimeter furnishings leave the existing walkable floor clear.
    for(const side of [-1,1]){
      g.box(0,side*10.46,.15,29.4,.23,.45,'#776b5d');
      g.box(0,side*10.5,10.2,29.4,.25,.18,'#e0caae');
      for(const x of [-9,0,9]){g.box(x,side*10.42,6.2,2.25,.18,2.2,'#776f61');g.box(x,side*10.28,6.4,1.93,.08,1.8,'#9aaba4');}
    }
    g.box(14.48,0,.05,.18,21.2,.45,'#7f7060');
    for(const y of [-7,0,7]){g.box(12,y,15.1,4.1,1.45,.16,'#d4c3a6');g.box(12,y,14.93,3.6,1.1,.14,'#f1d9aa');}
    if(s.safe&&s.kind==='club'){
      g.box(10,0,1.3,6.65,15.5,.16,'#4b405d');
      for(const side of [-1,1]){
        g.box(12,side*7,1.48,1.4,1.4,5.2,'#3f4656');
        for(const z of [2.4,4.5])g.bar([11.2,side*7,z],[11.04,side*7,z],.47,'#84919b',8);
        g.box(1.5,side*9,0,6.5,1.8,1.3,'#63506e');g.box(1.5,side*9.6,1.3,6.5,.58,1.6,'#79618a');
        for(const x of [-8,-3,3,8])g.box(x,side*10.36,12.8,1.3,.25,.32,side===1?'#c376ad':'#6aafc0');
      }
      g.box(12,0,3.3,1.8,5.8,.12,'#777184');
      for(const side of [-1,1])g.bar([12,side*1.5,3.43],[12,side*1.5,3.52],.65,'#303c4d',8);
      if(rich)for(let i=-2;i<=2;i++)g.box(4,i*3,.09,3.7,.10,.035,'#d3b4ce');
    }else if(s.safe){
      // Sofa, bed, storage and kitchen-counter accents.
      g.box(9,-6,1.7,6.6,4.6,.35,'#dbd0ba');g.box(11.1,-6,2.05,1.5,4.4,.45,'#b5c6b9');
      g.box(12.7,-6,0,.35,5.3,3.2,wood);g.box(9,6,2,4.7,2.7,.18,'#a99172');
      g.box(1,6,1.4,4.6,1.8,.45,fabric);g.box(1,7.02,1.5,5,.45,1.65,'#57716b');
      for(const x of [-1.4,3.4])g.box(x,6,1.4,.32,1.65,.70,'#526d64');
      g.box(13.8,5.5,3.3,.22,4.0,2.3,'#394a4e');g.box(13.63,5.5,3.48,.08,3.6,1.9,'#708f91');
      if(rich){g.box(6,-9.5,.02,4.2,1.6,.06,'#9f8068');g.box(12.5,9,.1,1.2,1.2,2.4,'#8d775f');}
    }else{
      // Retail shelves with small packaged goods; cafe variants use a coffee display.
      g.box(4,0,4,2.22,13.15,.25,'#bca387');
      g.box(4.7,2.8,4.25,1.1,1.55,.58,'#3d5257');g.box(4.7,2.8,4.83,.92,1.26,.08,'#8dada4');
      for(const side of [-1,1]){
        g.box(9,side*9.5,0,6.5,1.8,.42,wood);
        for(const z of [1.7,3.5,5.3]){g.box(9,side*9.5,z,6.5,1.8,.16,wood);for(let j=0;j<(rich?5:3);j++)g.box(6.5+j*(rich?1.1:2),side*9.42,z+.16,.65,.62,.68,['#b9a16c','#708d8b','#b67d69','#a5a886','#7792a6'][j]);}
        for(const x of [5.8,12.2])g.box(x,side*9.5,0,.25,1.8,5.5,metal);
      }
      if(/cafe|restaurant/i.test(s.id||'')){g.box(7,-2.3,3.4,2.1,1.4,1.1,'#596c70');g.box(7,-2.3,4.5,1.75,1.05,.18,'#bcc2b6');}
    }
  }
  function dynamic(state,cam) {
    const m=mesh(), p=state.player, first=cam.mode==='first';m.detail=state.quality;
    const far2=cam.far*cam.far,near=v=>(v.x-cam.x)**2+(v.y-cam.y)**2<far2;
    if(state.interior){const s=state.interior,g=local(m,s.x,s.y);g.box(0,0,-.4,30,22,.4,'#a99a81');g.box(0,-11,0,30,.7,16,'#b9ab95');g.box(0,11,0,30,.7,16,'#b9ab95');g.box(15,0,0,.7,22,16,'#a99a81');if(s.safe){if(s.kind==='club'){g.box(10,0,0,7,16,1.3,'#77538d');for(let i=-2;i<=2;i++)g.box(0,i*3,.02,4,2.5,.12,i%2?'#cb75ad':'#607fcb');g.box(12,0,1.3,2,8,2,'#493450');}else{g.box(9,-6,0,7,5,1.7,'#c6ad91');g.box(9,6,0,5,3,2,'#84664e');g.box(1,6,0,5,2,1.4,'#517d72');}}else{g.box(4,0,0,2,13,4,'#705442');actor(m,s.keeper,false,state.elapsed);}if(!tvSafe()&&m.detail!=='low')a4InteriorDetails(g,s,m.detail==='high');}else{
    for(const v of state.vehicles)if(near(v))automobile(m,v,v.id===p.vehicleId,state.elapsed,first&&v.id===p.vehicleId,Math.hypot(v.x-cam.x,v.y-cam.y)<(state.quality==='high'?170:105));
    for(const person of [...state.locals,...state.officers])if(near(person))actor(m,person,false,state.elapsed,'ar');}
    if(!state.interior)for(const r of state.remotePlayers||[])if(near(r)){if(r.vehicle)automobile(m,{...r,id:'remote-'+r.id,kind:'parked',hp:100,wheel:0,steer:0,color:'#597cbe'},false,state.elapsed,false,Math.hypot(r.x-cam.x,r.y-cam.y)<105);else actor(m,{...r,hp:100,z:0,color:'#6d8bb9',pants:'#354256',skinTone:'#c4926d',hair:'#362a27',phase:r.moving?Math.sin(state.elapsed*5):0,motion:r.moving?'walking':'idle'},false,state.elapsed);}
    if(!first&&!p.vehicleId)actor(m,p,true,state.elapsed,state.weapons[state.weapon]?.id);
    if(first&&!p.vehicleId&&!state.interior?.safe){
      const hands=local(m,p.x,p.y,p.z,cam.yaw);
      const sway=a3CityStride(p,state.elapsed,a3CityVisuals(m))*.11;
      const kick=Math.max(0,(p.aimUntil||0)-state.elapsed)*.55;
      hands.bar([.9,1.34,9.65+sway],[3.67,1.12,10.14+sway],.33,'#ba9474');
      heldWeapon(hands,3.63-kick,1.12,10.08+sway+kick,state.weapons[state.weapon]?.id);
    }
    const g=local(m),goal=!state.interior&&W().objectiveGoal(state);
    if(!state.interior)for(const site of [...state.map.properties,state.map.dealer,...state.map.venues])if(near(site))g.bar([site.x,site.y,.2],[site.x,site.y,.4],5.5,'#77c7ce',10);
    if(!state.interior)for(const site of state.map.signals)if(near(site)){g.box(site.x+30,site.y+30,0,1,1,10,'#777a71');g.box(site.x+30,site.y+30,10,2,2,3,W().signalRed(state,site,true)?'#ed655c':'#61d79a');if(!tvSafe()&&m.detail!=='low'){g.box(site.x+30,site.y+30,0,1.7,1.7,.45,'#657271');g.box(site.x+30,site.y+30,13,2.3,2.3,.25,'#495958');}}
    if(goal&&near(goal)){
      g.bar([goal.x,goal.y,.2],[goal.x,goal.y,.38],6.5,'#edb955',10);
      const z=11+Math.sin(state.elapsed*2)*.9;
      for(let i=0;i<4;i++)g.face([[goal.x,goal.y,z-3],[goal.x+2*Math.cos(i*Math.PI/2),goal.y+2*Math.sin(i*Math.PI/2),z],
        [goal.x+2*Math.cos((i+1)*Math.PI/2),goal.y+2*Math.sin((i+1)*Math.PI/2),z]],'#ffe5a1',.88+i*.06);
    }
    for(const f of state.effects)g.bar([f.x,f.y,f.z],[f.ex,f.ey,f.ez],.13,f.kind==='shot'?'#ffe6a5':'#ee9d76',3);
    return m;
  }
  function camera(state,options) {
    const p=state.player,car=!!p.vehicleId,first=!!state.interior||options.mode==='first',yaw=options.yaw;
    const pitch=clamp(options.tilt+(first?-.045:car?-.15:-.115),-.78,.62);
    const cx=Math.cos(yaw),sy=Math.sin(yaw), focus=p.z+(car?7.45:11.6);
    let x=p.x,y=p.y,z=focus;
    if(first){
      if(car){x+=Math.cos(p.angle)*.1+Math.sin(p.angle)*1.85;y+=Math.sin(p.angle)*.1-Math.cos(p.angle)*1.85;}
      else {x+=cx*.4;y+=sy*.4;}
    }else{
      const back=options.cinematic?(car?56:36):(car?46:28),shoulder=car?0:Math.min(3.5,(options.aspect||1.6)*2.5);
      const dx=-cx*back-sy*shoulder,dy=-sy*back+cx*shoulder,dz=options.cinematic?(car?14.5:9.5):(car?11.2:4.85);
      const len=Math.hypot(dx,dy,dz), wall=W().wallDistance(x,y,dx/len,dy/len,len,focus,dz/len,1.15);
      const scale=Math.max(0,wall-.35)/len;
      x+=dx*scale;y+=dy*scale;z+=dz*scale;
    }
    return {x,y,z,yaw,pitch,cx,sy,cp:Math.cos(pitch),sp:Math.sin(pitch),far:state.interior?45:tiers[state.quality].far,mode:first?'first':options.mode};
  }
  function viewPoint(p,c) {
    const x=p[0]-c.x,y=p[1]-c.y,z=p[2]-c.z,front=x*c.cx+y*c.sy;
    return [-x*c.sy+y*c.cx,z*c.cp-front*c.sp,front*c.cp+z*c.sp];
  }
  function sky(canvas,cam) {
    if(!canvas)return;
    // The panorama follows the lens and sits behind the depth-buffered city.
    const w=480,h=Math.max(125,Math.round(w*canvas.clientHeight/Math.max(1,canvas.clientWidth)));
    const last=panoramas.get(canvas);
    if(last && last.h===h && Math.abs(last.yaw-cam.yaw)<.001 && Math.abs(last.pitch-cam.pitch)<.001)return;
    panoramas.set(canvas,{h,yaw:cam.yaw,pitch:cam.pitch});
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const g=canvas.getContext('2d'),f=h*.5/Math.tan(.525), horizon=h*.5+Math.tan(cam.pitch)*f;
    const grad=g.createLinearGradient(0,horizon-h*.7,0,horizon+10);
    grad.addColorStop(0,'#659eae');grad.addColorStop(.48,'#a4ccca');grad.addColorStop(.84,'#efd6b2');grad.addColorStop(1,'#f3c49d');
    g.fillStyle=grad;g.fillRect(0,0,w,h);
    const angle=Math.atan2(Math.sin(-.53-cam.yaw),Math.cos(-.53-cam.yaw));
    if(Math.abs(angle)<1.4){
      const x=w*.5+Math.tan(angle)*f,y=horizon-h*.17;
      const glow=g.createRadialGradient(x,y,2,x,y,h*.18);glow.addColorStop(0,'#fff3ca');glow.addColorStop(.18,'#ffecc3');glow.addColorStop(1,'#ffddb000');
      g.fillStyle=glow;g.fillRect(x-h*.18,y-h*.18,h*.36,h*.36);
      g.fillStyle='#fff3ce';g.beginPath();g.arc(x,y,h*.024,0,tau);g.fill();
    }
    for(let layer=0;layer<2;layer++){
      g.beginPath();g.moveTo(0,h);
      for(let x=0;x<=w+4;x+=4){
        const a=cam.yaw+Math.atan((x-w*.5)/f);
        const terrain=Math.abs(Math.sin(a*5+layer)*.46+Math.sin(a*11+layer)*.22+Math.cos(a*21+layer)*.14+Math.sin(a*39)*.05);
        g.lineTo(x,horizon-h*(.015+(layer?.062:.104)*terrain)+layer*3);
      }
      g.lineTo(w,h);g.closePath();g.fillStyle=layer?'#9ba99d':'#c7b9aa';g.fill();
    }
    // The harbor skyline spans the far shore, beyond the playable roads.
    for(let index=0;index<64;index++){
      const az=index*tau/64;
      const diff=Math.atan2(Math.sin(az-cam.yaw),Math.cos(az-cam.yaw));if(Math.abs(diff)>1.22)continue;
      const x=w*.5+Math.tan(diff)*f,profile=(Math.sin(az*3+1)+1)*.5;
      const ht=h*(.019+.058*profile*profile*(.4+.6*Math.abs(Math.sin(index*41.8)))),sw=h*(.012+.011*Math.abs(Math.cos(index*12.1)));
      g.fillStyle=index%3?'#a4aba0':'#b6b1a2';g.fillRect(x,horizon+3-ht,sw,ht);
      if(index%4===1){g.fillRect(x+sw*.24,horizon-ht-1,sw*.5,4);}
    }
    g.fillStyle='#7fa8a1';g.fillRect(0,horizon+4,w,h);
  }
  function pack(groups,reusable){
    let count=0;for(const m of groups)for(const face of m.faces)count+=Math.max(0,face.p.length-2)*24;
    const data=reusable&&reusable.length>=count?reusable:new Float32Array(reusable?Math.max(count,Math.ceil(reusable.length*1.5),1024):count);let offset=0;
    for(const m of groups)for(const face of m.faces){const rgb=face.c.rgb;for(let j=1;j<face.p.length-1;j++)for(let k=0;k<3;k++){
      const i=k===0?0:k===1?j:j+1,p=face.p[i],uv=face.uv?.[i];data[offset++]=p[0];data[offset++]=p[1];data[offset++]=p[2];data[offset++]=rgb[0];data[offset++]=rgb[1];data[offset++]=rgb[2];data[offset++]=uv?uv[0]/1024:-1;data[offset++]=uv?uv[1]/1024:-1;
    }}return {data,used:data.subarray(0,offset)};
  }
  function gpu(gl,groups,atlas) {
    const vs='precision highp float;attribute vec3 p;attribute vec3 color;attribute vec2 uv;uniform vec3 eye;uniform vec4 turn;uniform vec3 lens;varying mediump vec3 tint;varying mediump vec2 st;varying mediump float mist;void main(){vec3 q=p-eye;float front=dot(q.xy,turn.xy);float side=dot(q.xy,vec2(-turn.y,turn.x));float depth=front*turn.z+q.z*turn.w;float up=q.z*turn.z-front*turn.w;gl_Position=vec4(side*lens.x,up*lens.y,(lens.z+0.45)/(lens.z-0.45)*depth-0.9*lens.z/(lens.z-0.45),depth);tint=color;st=uv;mist=smoothstep(lens.z*0.34,lens.z,depth)*0.82;}';
    const fs='precision mediump float;varying mediump vec3 tint;varying mediump vec2 st;varying mediump float mist;uniform sampler2D atlas;void main(){vec3 rgb=tint;if(st.x>=0.)rgb*=texture2D(atlas,st).rgb;gl_FragColor=vec4(mix(rgb,vec3(.76,.77,.68),mist),1.);}';
    function shader(type,source){
      const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
      if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));
      return sh;
    }
    const program=gl.createProgram(), vertex=shader(gl.VERTEX_SHADER,vs),fragment=shader(gl.FRAGMENT_SHADER,fs);
    gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const attributes=['p','color','uv'].map(name=>gl.getAttribLocation(program,name));
    const uniforms=['eye','turn','lens'].map(name=>gl.getUniformLocation(program,name));
    const fixed=gl.createBuffer(),moving=gl.createBuffer(),tex=gl.createTexture();
    let count=0,dynamicBuffer=new Float32Array(1024);function replace(groups){const vertices=pack(groups).used;gl.bindBuffer(gl.ARRAY_BUFFER,fixed);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);count=vertices.length/8;}replace(groups);
    gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
    function bind(buffer){
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      attributes.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,i===2?2:3,gl.FLOAT,false,32,i*12);});
    }
    return {
      replace,
      frame(cam,w,h,m){
        const f=1/Math.tan(.525);gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.uniform3f(uniforms[0],cam.x,cam.y,cam.z);gl.uniform4f(uniforms[1],cam.cx,cam.sy,cam.cp,cam.sp);gl.uniform3f(uniforms[2],f*h/w,f,cam.far);
        bind(fixed);gl.drawArrays(gl.TRIANGLES,0,count);
        const packed=pack([m],dynamicBuffer);dynamicBuffer=packed.data;const verts=packed.used;bind(moving);gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STREAM_DRAW);gl.drawArrays(gl.TRIANGLES,0,verts.length/8);
      },
      release(){gl.deleteBuffer(fixed);gl.deleteBuffer(moving);gl.deleteTexture(tex);gl.deleteProgram(program);}
    };
  }
  function clipNear(points) {
    const output=[];let a=points.at(-1);
    for(const b of points){
      if((a[2]>=.65)!==(b[2]>=.65)){
        const u=(.65-a[2])/(b[2]-a[2]);output.push(a.map((v,i)=>v+(b[i]-v)*u));
      }
      if(b[2]>=.65)output.push(b);a=b;
    }
    return output;
  }
  function textured(ctx,atlas,p,q,r) {
    const ux=q[2]-p[2],uy=q[3]-p[3],vx=r[2]-p[2],vy=r[3]-p[3],det=ux*vy-uy*vx;
    if(Math.abs(det)<.01)return;
    const dx=q[0]-p[0],dy=q[1]-p[1],ex=r[0]-p[0],ey=r[1]-p[1];
    const a=(dx*vy-ex*uy)/det,b=(dy*vy-ey*uy)/det,c=(ex*ux-dx*vx)/det,d=(ey*ux-dy*vx)/det;
    ctx.save();ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.lineTo(r[0],r[1]);ctx.closePath();ctx.clip();
    ctx.transform(a,b,c,d,p[0]-a*p[2]-c*p[3],p[1]-b*p[2]-d*p[3]);ctx.drawImage(atlas,0,0);ctx.restore();
  }
  function software(ctx,groups,atlas) {
    return {replace(next){groups=next;},frame(cam,w,h,m){
      ctx.clearRect(0,0,w,h);const f=h*.5/Math.tan(.525), ground=[],objects=[];
      function collect(group) {
        const list=group.ground?ground:objects;
        for(const face of group.faces){
          if(face.solid||face.uv){
            const [a,b,c]=face.p,ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
            if((uy*vz-uz*vy)*(cam.x-a[0])+(uz*vx-ux*vz)*(cam.y-a[1])+(ux*vy-uy*vx)*(cam.z-a[2])<0)continue;
          }
          let coords=face.p.map((p,i)=>{const q=viewPoint(p,cam);return face.uv?q.concat(face.uv[i]):q;});
          if(coords.every(p=>p[2]<.65)||coords.every(p=>p[2]>cam.far))continue;
          function projectFace(coords) {
          if(coords.some(p=>p[2]<.65))coords=clipNear(coords);
          if(coords.length<3)return;
          const screen=coords.map(p=>[w*.5+f*p[0]/p[2],h*.5-f*p[1]/p[2],p[3],p[4]]);
          if(screen.every(p=>p[0]<-1)||screen.every(p=>p[0]>w+1)||screen.every(p=>p[1]<-1)||screen.every(p=>p[1]>h+1))return;
          const depth=coords.reduce((a,p)=>a+p[2],0)/coords.length;
          list.push({screen,depth,c:face.c,uv:face.uv,z:face.p[0][2]});
          }
          // Split receding facades before affine texture mapping on the 2D fallback.
          const dz=face.uv?Math.abs(coords[0][2]-coords[1][2]):0;
          const n=Math.min(10,Math.ceil(dz/Math.max(2,Math.min(coords[0][2],coords[1][2])*.23)));
          if(n<2)projectFace(coords);
          else{
            const blend=(a,b,t)=>a.map((v,k)=>v+(b[k]-v)*t);
            let bottom=coords[0],top=coords[3];
            for(let j=1;j<=n;j++){
              const nb=blend(coords[0],coords[1],j/n),nt=blend(coords[3],coords[2],j/n);
              projectFace([bottom,nb,nt,top]);bottom=nb;top=nt;
            }
          }
        }
      }
      for(const group of groups){
        const dx=group.x-cam.x,dy=group.y-cam.y,front=dx*cam.cx+dy*cam.sy;
        if(front < -group.r || front > cam.far+group.r || Math.abs(-dx*cam.sy+dy*cam.cx)>Math.max(1,front)*w/(f*2)+group.r*2)continue;
        collect(group);
      }
      collect(m);
      ground.sort((a,b)=>a.z-b.z||b.depth-a.depth);objects.sort((a,b)=>b.depth-a.depth);
      for(const item of ground.concat(objects)){
        const points=item.screen;
        if(item.uv){
          for(let i=1;i<points.length-1;i++)textured(ctx,atlas,points[0],points[i],points[i+1]);
        }else{
          ctx.fillStyle=item.c.css;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
          for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fill();
        }
      }
    },release(){}};
  }
  function draw(canvas,state,cam,backdrop) {
    const w=canvas.clientWidth,h=canvas.clientHeight;if(w<=0||h<=0)return;
    let renderer=renderers.get(canvas);
    if(!renderer){
      const groups=[],atlas=facadeAtlas();
      const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:'low-power'});
      const make=()=>gl?gpu(gl,groups,atlas):software(canvas.getContext('2d'),groups,atlas);
      renderer={engine:null,gl,lost:false,disposed:false,region:null,layer:null};
      function fallback(){const layer=document.createElement('canvas');layer.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';const ctx=layer.getContext('2d');if(!ctx)return false;canvas.insertAdjacentElement('afterend',layer);renderer.layer=layer;renderer.gl=null;renderer.engine=software(ctx,[],atlas);renderer.region=null;renderer.lost=false;canvas.dataset.renderer='software TV fallback';return true;}
      try{renderer.engine=make();}catch(error){if(!tvSafe()||!fallback())throw error;}
      renderers.set(canvas,renderer);if(!renderer.layer)canvas.dataset.renderer=gl?'webgl':'software';
      if(gl){
        renderer.onLost=e=>{if(renderer.disposed)return;e.preventDefault();if(tvSafe()&&!renderer.layer&&fallback())return;renderer.lost=!renderer.layer;};renderer.onRestored=()=>{if(renderer.disposed||renderer.layer)return;renderer.engine=make();renderer.region=null;renderer.lost=false;};
        canvas.addEventListener('webglcontextlost',renderer.onLost);canvas.addEventListener('webglcontextrestored',renderer.onRestored);
      }
    }
    if(renderer.lost)return;
    const size=Math.min(tvSafe()?230400:Infinity,renderer.gl?tiers[state.quality].pixels:Math.min(400000,tiers[state.quality].pixels))*(state.renderScale||1)**2;
    const scale=Math.min(devicePixelRatio||1,1.5,Math.sqrt(size/(w*h)));
    const bw=Math.max(1,Math.floor(w*scale)),bh=Math.max(1,Math.floor(h*scale));
    const target=renderer.layer||canvas;if(target.width!==bw||target.height!==bh){target.width=bw;target.height=bh;}
    if(!renderer.gl||tvSafe())cam={...cam,far:Math.min(cam.far,tvSafe()?235:350)};
    const region=state.interior?'inside':Math.floor(cam.x/240)+','+Math.floor(cam.y/240)+','+state.quality;
    if(renderer.region!==region){renderer.engine.replace(state.interior?[]:scenery(state.map,{x:Math.floor(cam.x/240)*240+120,y:Math.floor(cam.y/240)*240+120,radius:cam.far+160,quality:state.quality}));renderer.region=region;}
    sky(backdrop,cam);renderer.engine.frame(cam,bw,bh,dynamic(state,cam));
  }
  function release(canvas) {
    const r=renderers.get(canvas);if(!r)return;
    r.disposed=true;renderers.delete(canvas);if(r.onLost)canvas.removeEventListener('webglcontextlost',r.onLost);if(r.onRestored)canvas.removeEventListener('webglcontextrestored',r.onRestored);r.engine.release();r.gl?.getExtension('WEBGL_lose_context')?.loseContext();r.layer?.remove();panoramas.delete(canvas);
  }
  window.RecoilCityView=Object.freeze({draw,camera,release});
})();
