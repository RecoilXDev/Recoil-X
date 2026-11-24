// Recoil City uses the same planar positions and footprints as its simulation.
// The renderer projects world units to a fixed camera and caches the stationary scenery.
(() => {
  'use strict';
  const across = .88, down = .47;
  const cityCache = new WeakMap();
  const palettes = {
    'Old Quarter': [
      ['#dfac82','#b67a59','#f0cf9e','#a63e34'], ['#ebcf9c','#c1a171','#f7dfb6','#187d78'],
      ['#da9a78','#ad735f','#edb48c','#815a70'], ['#cfc6ad','#a39e8d','#e6dbbc','#ac5d3c']
    ],
    'Neon Heights': [
      ['#6c9c9d','#49767d','#b3d2c4','#b85361'], ['#5d8594','#465f7e','#b9c9ca','#d5923b'],
      ['#8e9ead','#667c90','#cdd2c7','#2d7878']
    ],
    'Canal Ward': [
      ['#a8c7b3','#749c91','#cee1bd','#227c7f'], ['#e6c493','#b89b78','#ead7a5','#b65c3f'],
      ['#aed1c7','#7ba9a0','#d8ddbb','#487a73']
    ],
    'South Docks': [
      ['#a9b7b0','#83938f','#d1cdb8','#ae633d'], ['#9dacac','#6f878c','#bfcebd','#357b81'],
      ['#d29977','#a87560','#dfbe92','#70516a']
    ]
  };
  const shops = ['PALM', 'RADIO', 'MARKET', 'CAFE', 'ARCADE', 'STUDIO'];
  const project = (x,y,z=0) => [across*(x-y), down*(x+y)-z];
  function polygon(c, points, fill, edge) {
    c.beginPath();
    c.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);
    c.closePath();
    c.fillStyle=fill; c.fill();
    if(edge){c.strokeStyle=edge;c.lineWidth=.65;c.stroke();}
  }
  function line(c,a,b,color,width=1) {
    c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();
  }
  function disc(c,x,y,rx,ry,color) {
    c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();
  }
  function roof(c,x,y,z,w,h,color) {
    polygon(c,[project(x,y,z),project(x+w,y,z),project(x+w,y+h,z),project(x,y+h,z)],color);
  }
  function box(c,x,y,z,w,h,height,front,side,top) {
    const hi=z+height;
    polygon(c,[project(x,y+h,z),project(x+w,y+h,z),project(x+w,y+h,hi),project(x,y+h,hi)],front);
    polygon(c,[project(x+w,y,z),project(x+w,y+h,z),project(x+w,y+h,hi),project(x+w,y,hi)],side);
    roof(c,x,y,hi,w,h,top);
  }
  function smallCanvas(w,h) {
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.ceil(w));canvas.height=Math.max(1,Math.ceil(h));return canvas;
  }
  function seedAt(x,y) {
    let n=Math.imul(Math.floor(x)+71,73856093)^Math.imul(Math.floor(y)+47,19349663);
    return (n^(n>>>15))>>>0;
  }
  function facade(c,x,y,z,length,height,alongX,color) {
    const x2=alongX?x+length:x,y2=alongX?y:y+length;
    polygon(c,[project(x,y,z),project(x2,y2,z),project(x2,y2,z+height),project(x,y,z+height)],color);
  }
  function sign(c,x,y,z,width,label,background) {
    const height=Math.min(6,width/3), [sx,sy]=project(x,y,z+height);
    c.save();c.transform(across,down,0,1,sx,sy);
    c.fillStyle=background;c.fillRect(0,0,width,height);
    c.fillStyle='#fff0c7';c.textAlign='center';c.textBaseline='middle';
    c.font='bold '+height*.74+'px sans-serif';c.fillText(label,width/2,height*.54,width-1.4);
    c.restore();
  }
  function buildingSprite(b,label) {
    const {w,h}=b,seed=seedAt(b.x,b.y),district=palettes[b.district]?b.district:'Old Quarter';
    const skins=palettes[district], [front,side,top,accent]=skins[seed%skins.length];
    const tower=district==='Neon Heights',shed=district==='South Docks';
    const height=tower?42+seed%33:shed?15+seed%12:20+seed%25;
    const roofH=height+20, scale=window.devicePixelRatio>1||window.innerWidth>600?2:1.5;
    const left=-across*h-3,topY=-roofH-3;
    const width=across*(w+h)+6,spanY=down*(w+h)+roofH+7;
    const canvas=smallCanvas(width*scale,spanY*scale),c=canvas.getContext('2d');
    c.setTransform(scale,0,0,scale,-left*scale,-topY*scale);
    box(c,0,0,0,w,h,height,front,side,top);
    // The two visible facades share sill heights, so corners meet cleanly.
    const stories=Math.max(1,Math.floor((height-4)/10));
    for(const along of [true,false]){
      const length=along?w:h, cols=Math.max(1,Math.floor((length-2)/(tower?10:13)));
      const stride=length/cols;
      for(let row=0;row<stories;row++){
        const z=4+(height-6)/stories*row;
        for(let col=0;col<cols;col++){
          const span=Math.min(stride*.66,12),edge=col*stride+(stride-span)/2;
          const xx=along?edge:w,yy=along?h:edge;
          const tone=(seed+col*7+row*11)%9===0?'#d1bb86':along?'#47747a':'#405e68';
          facade(c,xx,yy,z,span,tower?6.8:5.5,along,tone);
          facade(c,xx,yy,z+.4,span*.24,tower?5.9:4.5,along,'#709399');
          if(!tower)facade(c,xx,yy,z-.7,span,.8,along,'#d4bd9e');
        }
      }
    }
    // Roof parapet, machinery and recessed roofing keep small blocks readable.
    roof(c,2,2,height+.2,w-4,h-4,side);
    roof(c,3,3,height+.3,w-6,h-6,top);
    const rw=Math.min(w*.24,17),rh=Math.min(h*.3,13);
    box(c,w*.22,h*.18,height+.35,rw,rh,3.5,'#b4ac96','#8f9991','#d8cfb6');
    for(let i=2;i<rh-1;i+=2)line(c,project(w*.22+1,h*.18+i,height+4),project(w*.22+rw-1,h*.18+i,height+4),'#899c97',.65);
    if(tower){
      box(c,w*.52,h*.36,height+.35,w*.22,h*.3,6,front,side,'#d7d6bc');
      const mast=project(w*.6,h*.47,height+6.5);
      line(c,mast,[mast[0],mast[1]-10],'#506872',1.1);
      disc(c,mast[0],mast[1]-10,1.3,1.3,'#ff9b61');
      facade(c,0,h,height-2,w,1.1,true,'#9edbcc');
    }else if(shed){
      for(let k=5;k<w-3;k+=6)line(c,project(k,2,height+.5),project(k,h-2,height+.5),'#a6aa9c',.6);
      for(let k=3;k<w-20;k+=25)facade(c,k,h,.4,16,9,true,'#6e807e');
    }else{
      const aw=Math.min(w-5,Math.max(12,w*.52)),ax=(w-aw)/2;
      const awz=8;
      const doorX=Math.max(1,ax+(aw-4)/2);
      facade(c,doorX,h,0,4.5,6.6,true,'#385f65');
      facade(c,doorX+2.3,h,.5,.2,5.7,true,'#93aa9f');
      polygon(c,[project(ax,h,awz),project(ax+aw,h,awz),project(ax+aw,h+2.5,awz-1),project(ax,h+2.5,awz-1)],accent);
      for(let k=0;k<aw;k+=4)facade(c,ax+k,h+2.5,awz-2.1,Math.min(2,aw-k),1.2,true,'#e5cea1');
      sign(c,ax,h,awz+.8,aw,(label||b.name||shops[(seed>>>6)%shops.length]).toUpperCase(),accent);
    }
    if(!tower&&!shed){
      if((seed>>>8)%2===0){
        const pw=Math.min(w*.42,21),ph=Math.min(h*.23,12),px=w*.48,py=h*.49;
        box(c,px,py,height+.4,pw,ph,1,'#617677','#697777','#638388');
        for(let i=3;i<pw;i+=4)line(c,project(px+i,py,height+1.5),project(px+i,py+ph,height+1.5),'#93a5a1',.45);
        line(c,project(px,py+ph*.5,height+1.5),project(px+pw,py+ph*.5,height+1.5),'#9baba5',.45);
      }else{
        box(c,w*.59,h*.52,height+.5,5,4.2,5.2,'#b88f70','#a78064','#d5b48d');
        box(c,w*.58,h*.51,height+5.7,6,5,1,'#a49077','#887866','#e3c6a1');
      }
      facade(c,0,h,height-1.5,w,.8,true,'#e8cba7');
    }
    if(label){
      const boardWidth=Math.min(w*.8,Math.max(17,label.length*2.8)),xx=(w-boardWidth)/2,yy=h*.76;
      for(const k of [xx+2,xx+boardWidth-2])line(c,project(k,yy,height),project(k,yy,height+7),'#686b62',.85);
      sign(c,xx,yy,height+4.6,boardWidth,label.toUpperCase(),district==='Neon Heights'?'#4e6678':'#986745');
    }
    return {canvas,left,top:topY,w:canvas.width/scale,h:canvas.height/scale,height};
  }
  function groundMap(map) {
    const scale=1.5,canvas=smallCanvas(map.width*scale,map.height*scale),c=canvas.getContext('2d');
    c.scale(scale,scale);
    c.fillStyle='#d7c4a3';c.fillRect(0,0,map.width,map.height);
    // Paved waterfront promenades and a limestone quay rim.
    c.lineWidth=9;c.strokeStyle='#e6d9b8';c.strokeRect(4,4,map.width-8,map.height-8);
    const hw=map.roadWidth/2;
    for(const pass of [[map.roadWidth+13,'#e9d7b5'],[map.roadWidth+2,'#b7a98e'],[map.roadWidth,'#505b60']]){
      c.fillStyle=pass[1];
      for(const x of map.roadsX)c.fillRect(x-pass[0]/2,0,pass[0],map.height);
      for(const y of map.roadsY)c.fillRect(0,y-pass[0]/2,map.width,pass[0]);
    }
    c.strokeStyle='#d3b876';c.lineWidth=1.1;c.setLineDash([8,8]);
    for(const x of map.roadsX)for(const offset of [-1.3,1.3])line(c,[x+offset,0],[x+offset,map.height],'#d3b876',1);
    for(const y of map.roadsY)for(const offset of [-1.3,1.3])line(c,[0,y+offset],[map.width,y+offset],'#d3b876',1);
    c.setLineDash([6,10]);
    for(const x of map.roadsX)for(const n of [-1,1])line(c,[x+n*hw*.52,0],[x+n*hw*.52,map.height],'#a5abad',.8);
    for(const y of map.roadsY)for(const n of [-1,1])line(c,[0,y+n*hw*.52],[map.width,y+n*hw*.52],'#a5abad',.8);
    c.setLineDash([]);
    for(const x of map.roadsX)for(const y of map.roadsY){
      c.fillStyle='#505b60';c.fillRect(x-hw,y-hw,map.roadWidth,map.roadWidth);
      c.fillStyle='#dbd6be';
      for(let k=-hw+4;k<hw-4;k+=6){
        for(const d of [-1,1]){
          c.fillRect(x+k,y+d*(hw+1)-2.3,3.5,4.6);
          c.fillRect(x+d*(hw+1)-2.3,y+k,4.6,3.5);
        }
      }
    }
    for(const b of map.blocks){
      if(b.kind==='park'){
        c.fillStyle='#7ca784';c.fillRect(b.x,b.y,b.w,b.h);
        c.strokeStyle='#adbf90';c.lineWidth=2;c.strokeRect(b.x+2,b.y+2,b.w-4,b.h-4);
        line(c,[b.x,b.y+b.h*.55],[b.x+b.w,b.y+b.h*.55],'#d5cba5',5);
        line(c,[b.x+b.w*.45,b.y],[b.x+b.w*.45,b.y+b.h],'#d5cba5',4);
      }else{
        c.fillStyle='#ad9f88';c.fillRect(b.x+3,b.y+5,b.w+4,b.h+3);
      }
    }
    return canvas;
  }
  function buildCity(map) {
    const statics=[];
    for(const b of map.blocks){
      if(b.kind==='park'){
        for(const [fx,fy] of [[.16,.16],[.68,.2],[.25,.78],[.8,.72]])statics.push({kind:'tree',x:b.x+b.w*fx,y:b.y+b.h*fy});
      }else{
        statics.push({kind:'building',x:b.x,y:b.y,depth:b.x+b.y+(b.w+b.h)/2,b});
        if(b.h>40){
          statics.push({kind:'tree',x:b.x-5,y:b.y+b.h*.27});
          statics.push({kind:'lamp',x:b.x-5,y:b.y+b.h*.76});
        }
        if(b.w>35){
          statics.push({kind:'tree',x:b.x+b.w*.24,y:b.y+b.h+6});
          statics.push({kind:'bench',x:b.x+b.w*.67,y:b.y+b.h+5});
        }
        if(b.h>80)statics.push({kind:'tree',x:b.x+b.w+5,y:b.y+b.h*.35});
      }
    }
    for(const x of map.roadsX)for(const y of map.roadsY){
      const margin=map.roadWidth/2+4.5;
      for(const d of [-1,1])statics.push({kind:'signal',x:x+d*margin,y:y+d*margin});
    }
    for(const stop of [...map.stops,...(map.garage?[map.garage]:[])]){
      if(map.blocks.some(b=>b.kind==='park'&&b.name===stop.name))continue;
      let nearest=null,best=Infinity;
      for(const entry of statics){
        const b=entry.b;
        if(!b||entry.label)continue;
        const dx=Math.max(b.x-stop.x,0,stop.x-b.x-b.w),dy=Math.max(b.y-stop.y,0,stop.y-b.y-b.h);
        const gap=dx*dx+dy*dy;
        if(gap<best){best=gap;nearest=entry;}
      }
      if(nearest)nearest.label=stop.name;
    }
    for(const [x,y] of [[48,-12],[224,-12],[-12,68],[-12,300],[map.width+12,700],[900,map.height+12]]){
      statics.push({kind:'boat',x,y});
    }
    if(map.garage)statics.push({kind:'garage',x:map.garage.x,y:map.garage.y});
    return {map,land:groundMap(map),statics};
  }
  function tree(c,x,y,n) {
    const [sx,sy]=project(x,y);
    disc(c,sx+3,sy+1,7,2.6,'#446a6259');
    line(c,[sx,sy],[sx+1,sy-14],'#775c49',1.8);
    const palm=n%3!==0;
    if(palm){
      const cx=sx+1,cy=sy-15;
      for(let j=0;j<7;j++){
        const a=j*.9+(n%10)*.1,wx=Math.cos(a)*9.4,wy=Math.sin(a)*5.8;
        polygon(c,[[cx,cy],[cx+wx*.6+1,cy+wy*.4-4.2],[cx+wx,cy+wy],[cx+wx*.5-1,cy+wy*.45-1]],j%2?'#47876e':'#2d705e');
      }
    }else{
      disc(c,sx,sy-13,6.4,5.9,'#467d65');disc(c,sx-2.3,sy-15,4.7,3.8,'#649a76');
    }
  }
  function boat(c,x,y){
    const hull=(coords,z)=>coords.map(([a,b])=>project(x+a,y+b,z));
    const footprint=[[-9,-3.5],[6,-3.5],[12,0],[6,3.5],[-9,3.5],[-11,1],[-11,-1]];
    polygon(c,hull(footprint,-.4),'#456d76');polygon(c,hull(footprint,1.4),'#ece0c2','#6e918c');
    roof(c,x-7,y-2.2,1.6,12,4.4,'#b59775');
    box(c,x-3,y-2.3,1.8,6,4.4,2.4,'#9cb9b6','#72989b','#e7ddc1');
    const tip=project(x-4,y,4),mast=project(x-4,y,17);
    line(c,tip,mast,'#677f7f',.65);
    polygon(c,[mast,project(x-4,y,6),project(x+2,y,6)],'#f0cc92');
  }
  function streetProp(c,x,y,kind){
    if(kind==='bench'){
      box(c,x-3,y-.9,1,6,1.9,1,'#956f52','#7b6553','#bf976f');
      box(c,x-3,y-1,2,6,.4,1.6,'#ad8e68','#806b58','#c5aa7d');return;
    }
    const [px,py]=project(x,y);
    line(c,[px,py],[px,py-15],'#676f69',.9);
    line(c,[px,py-15],[px+2.8,py-16],'#6b746f',.9);
    disc(c,px+3,py-16,1.4,.65,'#f1dfa4');
  }
  function garageMark(c,x,y){
    const [px,py]=project(x,y);
    c.save();c.translate(px,py);c.scale(1,.53);
    c.strokeStyle='#b4daca';c.lineWidth=1.2;c.strokeRect(-9,-6,18,12);
    line(c,[-3,3],[2,-2],'#d2ead3',1.7);
    line(c,[2,-2],[1.7,-4],'#d2ead3',1.2);
    line(c,[2,-2],[4.4,-2.5],'#d2ead3',1.2);
    c.restore();
  }
  function signal(c,x,y,time) {
    const [sx,sy]=project(x,y);
    line(c,[sx,sy],[sx,sy-9],'#575c5c',1);
    c.fillStyle='#34484a';c.fillRect(sx-1.5,sy-13,3,5);
    disc(c,sx,sy-11,1,1,(Math.floor(time/6+x+y)%2)?'#9fd8a2':'#ff9e79');
  }
  function person(c,x,y,angle,color,phase,active) {
    const [sx,sy]=project(x,y), stride=phase*1.6;
    disc(c,sx+.7,sy+.5,3.1,1.3,'#203d414d');
    line(c,[sx-1.05,sy-3.6],[sx-1.2-stride*.45,sy],'#39434d',1.5);
    line(c,[sx+1.0,sy-3.6],[sx+1.2+stride*.45,sy-.2],'#39434d',1.5);
    polygon(c,[[sx-2,sy-7],[sx+1.4,sy-7.3],[sx+2.1,sy-4],[sx+.5,sy-3],[sx-1.5,sy-3.5]],color);
    const frontX=Math.cos(angle)-Math.sin(angle);
    disc(c,sx+.2,sy-8.8,1.55,1.9,active?'#c18b62':'#b88464');
    disc(c,sx,sy-10,1.55,.86,active?'#f7c266':'#514940');
    if(active)line(c,[sx,sy-9.7],[sx+frontX*1.4,sy-9.4],'#f7c266',1);
  }
  function vehicle(c,v,active,time) {
    const {x,y,angle}=v,ca=Math.cos(angle),sa=Math.sin(angle);
    const at=(l,t,z)=>project(x+l*ca-t*sa,y+l*sa+t*ca,z);
    const plane=(x1,x2,y1,y2,z,fill)=>polygon(c,[at(x1,y1,z),at(x2,y1,z),at(x2,y2,z),at(x1,y2,z)],fill);
    const L=10,W=4.7,coat=v.color||'#cf7860';
    const shadow=project(x+.8,y+1.4);disc(c,...shadow,Math.abs(ca-sa)*7+5,3.3,'#273e4559');
    for(const t of [-W,W])for(const l of [-6,6]){
      const p=at(l,t,.9);disc(c,p[0],p[1],2,1.2,'#29383e');
    }
    const corners=[[-L,-W+1],[-L+1,-W],[L-2,-W],[L,-W+1.5],[L,W-1.5],[L-2,W],[-L+1,W],[-L,W-1]];
    const base=corners.map(([l,t])=>at(l,t,1.1)),belt=corners.map(([l,t])=>at(l,t,3.5));
    polygon(c,base,'#344348');
    for(let k=0;k<corners.length;k++){
      const n=(k+1)%corners.length;
      if(belt[n][0]>=belt[k][0])continue;
      polygon(c,[base[k],base[n],belt[n],belt[k]],coat);
      polygon(c,[base[k],base[n],belt[n],belt[k]],'rgba(33,48,52,.27)');
    }
    polygon(c,belt,coat,'#435556');
    polygon(c,[at(-5,-W+.8,3.55),at(-2,-3,5.9),at(-2,3,5.9),at(-5,W-.8,3.55)],'#59757b');
    plane(-2,2.1,-3,3,5.9,v.kind==='patrol'?'#dbe2db':coat);
    polygon(c,[at(2.1,-3,5.9),at(4.8,-W+.8,3.55),at(4.8,W-.8,3.55),at(2.1,3,5.9)],'#9dbbbb');
    for(const t of [-1,1]){
      polygon(c,[at(-5,t*(W-.8),3.55),at(-2,t*3,5.9),at(2.1,t*3,5.9),at(4.8,t*(W-.8),3.55)],'rgba(58,86,96,.45)');
      line(c,at(8,t*3,3.7),at(8,t*4.1,3.7),'#ffedc3',1.25);
      line(c,at(-9,t*3,3.7),at(-9,t*4.1,3.7),'#fc9d81',1.1);
    }
    if(v.kind==='patrol'){
      plane(-.7,.7,-2.3,0,6.4,Math.floor(time*4)%2?'#6fb9df':'#e8eee7');
      plane(-.7,.7,0,2.3,6.4,'#e28c76');
    }
    if(active){
      line(c,at(5.7,-2.3,3.65),at(8,-2.3,3.65),'#eedcb8',.8);
    }
  }
  function water(c,map,camera,viewW,viewH,time){
    const [ox,oy]=project(camera.x,camera.y),range=viewW+viewH;
    const l=Math.floor((camera.x-range)/50),r=Math.ceil((camera.x+range)/50);
    const t=Math.floor((camera.y-range)/50),b=Math.ceil((camera.y+range)/50);
    for(let iy=t;iy<=b;iy++)for(let ix=l;ix<=r;ix++){
      const seed=seedAt(ix,iy),x=ix*50+seed%39,y=iy*50+(seed>>>8)%40;
      if(x>0&&x<map.width&&y>0&&y<map.height)continue;
      const [sx,sy]=project(x,y);
      if(Math.abs(sx-ox)>viewW||Math.abs(sy-oy)>viewH)continue;
      const drift=Math.sin(time*.4+(seed%20))*1.8;
      line(c,[sx+drift,sy],[sx+drift+4+seed%13,sy],seed%2?'#80b7b0':'#95c4b8',.8);
    }
  }
  function marker(c,stop,time){
    const [sx,sy]=project(stop.x,stop.y);
    c.save();c.strokeStyle='#fff0bf';c.lineWidth=1;c.setLineDash([3,2]);
    c.beginPath();c.ellipse(sx,sy,9.5,4.2,0,0,Math.PI*2);c.stroke();c.restore();
    const y=sy-7-Math.sin(time*3)*.8;
    polygon(c,[[sx,y],[sx-3.4,y-5],[sx,y-8],[sx+3.4,y-5]],'#ffcf71','#554c39');
  }
  function draw(canvas,state) {
    if(!canvas||!state?.map||!state.player)return;
    const w=canvas.clientWidth||canvas.width,h=canvas.clientHeight||canvas.height;
    if(!w||!h)return;
    const ratio=Math.min(window.devicePixelRatio||1,1.6,Math.sqrt(1500000/(w*h)));
    const bw=Math.max(1,Math.round(w*ratio)),bh=Math.max(1,Math.round(h*ratio));
    if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;}
    const c=canvas.getContext('2d');if(!c)return;
    const {map,player}=state;
    let city=cityCache.get(canvas);
    if(city?.map!==map){city=buildCity(map);cityCache.set(canvas,city);}
    const time=performance.now()/1000;
    const zoom=Math.max(1.35,Math.min(2.85,Math.min(w,h)/245)),cam=project(player.x,player.y);
    const sx=w*.5,sy=h*.54,viewW=w/(2*zoom)+34,viewH=h*.56/zoom+64;
    c.setTransform(bw/w,0,0,bh/h,0,0);
    const sea=c.createLinearGradient(0,0,0,h);sea.addColorStop(0,'#71aaa9');sea.addColorStop(1,'#8bbdb0');
    c.fillStyle=sea;c.fillRect(0,0,w,h);
    c.translate(sx-cam[0]*zoom,sy-cam[1]*zoom);c.scale(zoom,zoom);
    water(c,map,player,viewW,viewH,time);
    polygon(c,[project(0,map.height),project(map.width,map.height),project(map.width,map.height,-4),project(0,map.height,-4)],'#7e988c');
    polygon(c,[project(map.width,0),project(map.width,map.height),project(map.width,map.height,-4),project(map.width,0,-4)],'#698c85');
    c.save();c.transform(across,down,-across,down,0,0);c.drawImage(city.land,0,0,map.width,map.height);c.restore();
    const visible=(x,y,padX,padY)=>{const q=project(x,y);return Math.abs(q[0]-cam[0])<viewW+padX&&Math.abs(q[1]-cam[1])<viewH+padY;};
    const items=[];
    for(const p of city.statics){
      const b=p.b;
      if(b?!visible(b.x+b.w/2,b.y+b.h/2,across*(b.w+b.h)/2,down*(b.w+b.h)/2+85):!visible(p.x,p.y,12,15))continue;
      items.push(p);
    }
    for(const p of state.pedestrians||[]){
      if(visible(p.x,p.y,8,10))items.push({kind:'walker',x:p.x,y:p.y,walker:p});
    }
    const nearby=!player.vehicleId&&state.nearbyVehicle;
    const focusCar=nearby&&(state.vehicles||[]).find(v=>v.id===nearby);
    for(const v of state.vehicles||[])if(visible(v.x,v.y,20,18))items.push({kind:'car',x:v.x,y:v.y,v});
    if(!player.vehicleId)items.push({kind:'player',x:player.x,y:player.y});
    const job=state.job,stop=job&&(job.stage==='pickup'?job.pickup:job.dropoff);
    if(stop&&visible(stop.x,stop.y,12,16))items.push({kind:'stop',x:stop.x,y:stop.y,stop});
    items.sort((a,b)=>(a.depth??a.x+a.y)-(b.depth??b.x+b.y));
    for(const it of items){
      const {x,y}=it;
      switch(it.kind){
        case 'building':{
          const sprite=it.sprite||(it.sprite=buildingSprite(it.b,it.label)),[px,py]=project(x,y);
          const left=px+sprite.left,top=py+sprite.top;
          // Fade a facade while it hides the player or the car they can enter.
          const obscures=actor=>{
            if(it.depth<=actor.x+actor.y)return false;
            const point=project(actor.x,actor.y),offset=(point[0]-px)/across;
            const first=Math.max(0,-offset),last=Math.min(it.b.h,it.b.w-offset);
            return first<=last&&point[1]>=py+down*(2*first+offset)-sprite.height
              &&point[1]-8<=py+down*(2*last+offset);
          };
          const fade=obscures(player)||(focusCar&&obscures(focusCar));
          if(fade)c.globalAlpha=.46;
          c.drawImage(sprite.canvas,left,top,sprite.w,sprite.h);
          if(fade)c.globalAlpha=1;
          break;
        }
        case 'boat':boat(c,x,y);break;
        case 'garage':garageMark(c,x,y);break;
        case 'lamp':case 'bench':streetProp(c,x,y,it.kind);break;
        case 'signal':signal(c,x,y,time);break;
        case 'tree':tree(c,x,y,seedAt(x,y));break;
        case 'walker':person(c,x,y,it.walker.angle,it.walker.color,it.walker.phase,false);break;
        case 'player':person(c,x,y,player.angle||0,'#1b887e',Math.sin((player.x+player.y)*.22),true);break;
        case 'car':{
          if(it.v.id===nearby){
            const [px,py]=project(x,y);c.save();c.strokeStyle='#f6de94';c.lineWidth=.85;
            c.setLineDash([2.6,2]);c.beginPath();c.ellipse(px,py,13,6.4,0,0,Math.PI*2);c.stroke();c.restore();
          }
          vehicle(c,it.v,it.v.id===player.vehicleId,time);break;
        }
        case 'stop':marker(c,it.stop,time);break;
      }
    }
    const tip=cam[1]-(player.vehicleId?11:14);
    polygon(c,[[cam[0]-2.6,tip-3],[cam[0]+2.6,tip-3],[cam[0],tip]],'#ffe0a1','#6c6550');
    c.setTransform(1,0,0,1,0,0);
  }
  window.RecoilCityView={draw};
})();
