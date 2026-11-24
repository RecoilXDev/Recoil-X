const fs=require('node:fs');
const vm=require('node:vm');

function attrsOf(s){
  return Object.fromEntries([...s.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m=>[m[1],m[2]??m[3]??m[4]??'']));
}

class Style {
  setProperty(k,v){this[k]=v;}
  getPropertyValue(k){return this[k]||'';}
  removeProperty(k){delete this[k];}
}
function storage(initial){
  const entries=new Map(Object.entries(initial||{}));
  return {entries, get length(){return entries.size;},key:i=>[...entries.keys()][i],
    getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,String(v)),removeItem:k=>entries.delete(k)};
}
function makeHarness(save={},iso='2026-11-14T12:00:00Z',network=null,bridge=''){
  const source=fs.readFileSync(__dirname+'/../../index.html','utf8');
  const html=source.replace(/<script>[\s\S]*?<\/script>/g,'').replace(/<style[^>]*>[\s\S]*?<\/style>/g,'');
  const gradient={addColorStop(){}};
  const context2d=new Proxy({createRadialGradient:()=>gradient, createLinearGradient:()=>gradient,measureText:t=>({width:t.length*8})},{
    get:(o,k)=>o[k]??(()=>{}),
  });
  const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  class Element{
    constructor(tag,attrs={}) {
      this.tagName=tag.toUpperCase();this.attrs=attrs;this.kids=[];this.parentElement=null;
      this._value=attrs.value??'';this.checked=Object.hasOwn(attrs,'checked');this.disabled=Object.hasOwn(attrs,'disabled');
      this.dataset=new Proxy({}, {set:(o,k,v)=>{this.attrs['data-'+k.replace(/[A-Z]/g,l=>'-'+l.toLowerCase())]=String(v);o[k]=String(v);return true;}});this.ownText='';this.width=Number(attrs.width||430);this.height=Number(attrs.height||250);
      this.style=new Style();this.handlers={};this.classList={
        contains:c=>this.className.split(/\s+/).includes(c),
        add:(...c)=>{this.className=[...new Set(this.className.split(/\s+/).filter(Boolean).concat(c))].join(' ');},
        remove:(...c)=>{this.className=this.className.split(/\s+/).filter(v=>!c.includes(v)).join(' ');},
        toggle:(c,b=!this.classList.contains(c))=>{if(b)this.classList.add(c);else this.classList.remove(c);return !!b;}
      };
      for(const k of Object.keys(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,l)=>l.toUpperCase())]=attrs[k];
    }
    get id(){return this.attrs.id||''} set id(v){this.attrs.id=v}
    get className(){return this.attrs.class||''} set className(v){this.attrs.class=String(v)}
    get children(){return this.kids}
    get options(){return this.kids.filter(k=>k.tagName==='OPTION')}
    get firstElementChild(){return this.kids[0]}
    get lastElementChild(){return this.kids.at(-1)}
    get parentNode(){return this.parentElement}
    get offsetWidth(){return 200} get offsetHeight(){return 80}
    get clientWidth(){return this.width} get clientHeight(){return this.height}
    get scrollHeight(){return 500}
    get textContent(){return this.ownText+this.kids.map(k=>k.textContent).join('')}
    set textContent(value){this.replaceChildren();this.ownText=String(value)}
    get innerText(){return this.textContent} set innerText(v){this.textContent=v}
    get innerHTML(){return this._html||''}
    set innerHTML(str){this._html=str;this.replaceChildren(...parse(str))}
    set outerHTML(str){const nodes=parse(str);this.before(...nodes);this.remove()}
    get value(){return this._value||(this.tagName==='SELECT'?this.options[0]?.value||'':'')}
    set value(x){this._value=String(x)}
    get selectedIndex(){return this.options.findIndex(o=>o.value===this.value)}
    append(...kids){for(let kid of kids){if(typeof kid==='string'){const node=new Element('#text');node.ownText=kid;kid=node;}if(!kid)continue;
      kid.remove();kid.parentElement=this;this.kids.push(kid);}}
    appendChild(k){this.append(k);return k;}
    prepend(...v){for(let k of v.reverse()){k.remove();k.parentElement=this;this.kids.unshift(k);}}
    replaceChildren(...kids){for(const k of this.kids)k.parentElement=null;this.kids=[];this.ownText='';this.append(...kids);}
    remove(){const p=this.parentElement;if(!p)return;const i=p.kids.indexOf(this);if(i>=0)p.kids.splice(i,1);this.parentElement=null}
    before(...nodes){const p=this.parentElement;if(!p)return;for(const n of nodes){n.remove();n.parentElement=p;p.kids.splice(p.kids.indexOf(this),0,n);}}
    after(...nodes){const p=this.parentElement;if(!p)return;for(const n of nodes.slice().reverse()){n.remove();n.parentElement=p;p.kids.splice(p.kids.indexOf(this)+1,0,n);}}
    insertAdjacentHTML(pos,html){const nodes=parse(html);if(pos==='beforebegin')this.before(...nodes);else if(pos==='afterend')this.after(...nodes);else if(pos==='afterbegin')this.prepend(...nodes);else if(pos==='beforeend')this.append(...nodes);else throw Error('Invalid insertion position');}
    insertAdjacentElement(pos,el){if(pos==='afterend')this.after(el);else if(pos==='beforebegin')this.before(el);else if(pos==='afterbegin')this.prepend(el);else this.append(el);return el}
    setAttribute(k,v){this.attrs[k]=String(v);if(k==='value')this.value=v;}
    getAttribute(k){return this.attrs[k]??null}
    removeAttribute(k){delete this.attrs[k]}
    hasAttribute(k){return Object.hasOwn(this.attrs,k)}
    matches(s){
      s=s.trim(); if(s==='*'||!s)return true;
      if(s.includes(':not(')){
        const v=/:not\(([^)]+)\)/.exec(s);if(v&&this.matches(v[1]))return false;s=s.replace(v[0],'');
      }
      if(s.includes(':last-child')){if(this.parentElement?.kids.at(-1)!==this)return false;s=s.replace(':last-child','');}
      if(s.includes(':first-child')){if(this.parentElement?.kids[0]!==this)return false;s=s.replace(':first-child','');}
      for(const m of s.matchAll(/\[([^=^\]]+)(?:(\^?=)"?([^"\]]*)"?)?\]/g)){
        const a=this.attrs[m[1]];
        if(a===undefined||m[2]==='='&&a!==m[3]||m[2]==='^='&&!a.startsWith(m[3]))return false;
      }
      s=s.replace(/\[[^\]]+\]/g,'');
      const tag=/^[\w-]+/.exec(s);
      if(tag&&this.tagName!==tag[0].toUpperCase())return false;
      const id=/#([\w-]+)/.exec(s);if(id&&this.id!==id[1])return false;
      for(const m of s.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(m[1]))return false;
      return !this.tagName.startsWith('#')||s.includes('#');
    }
    querySelectorAll(s){
      const all=[];const visit=n=>{for(const k of n.kids){if(k.tagName!=='#TEXT')all.push(k);visit(k);}};
      visit(this);
      return all.filter(e=>s.split(',').some(sel=>{
        const parts=sel.trim().split(/\s+/);const last=parts.pop();if(!e.matches(last))return false;
        let a=e.parentElement;
        while(parts.length){const key=parts.pop();if(key==='>'){const p=parts.pop();if(p===':scope'){if(a!==this)return false;}else if(!a?.matches(p))return false;a=a?.parentElement;continue;}
          if(key==='+'){if(!a)return false;const tag=parts.pop(),previous=a.children[a.children.indexOf(e)-1];if(!previous?.matches(tag))return false;continue;}
          if(key===':scope'){if(a!==this)return false;continue;}
          while(a&&!a.matches(key))a=a.parentElement;
          if(!a)return false;a=a.parentElement;
        }
        return true;
      }));
    }
    querySelector(s){return this.querySelectorAll(s)[0]||null;}
    closest(s){let e=this;while(e&&!e.matches(s))e=e.parentElement;return e;}
    addEventListener(k,f){(this.handlers[k]??=[]).push(f)}
    removeEventListener(){}
    dispatchEvent(ev){if(!ev.target)ev.target=this;this['on'+ev.type]?.(ev);for(const f of this.handlers[ev.type]||[])f(ev);return true}
    click(){if(!this.disabled)this.dispatchEvent({type:'click',preventDefault(){},stopPropagation(){}})}
    reset(){for(const p of this.querySelectorAll('input'))p.value=p.getAttribute('value')||'';}
    focus(){} blur(){} setPointerCapture(){} releasePointerCapture(){}
    getBoundingClientRect(){return {left:0,top:0,width:this.width,height:this.height,bottom:this.height,right:this.width}}
    getContext(type){return type==='2d'?context2d:null}
    toDataURL(){return 'data:image/png;base64,synthetic'}
    toBlob(callback,type){callback(new Blob([this.width+'x'+this.height],{type}));}
    requestPointerLock(){return Promise.resolve()}
  }
  function parse(markup) {
    const root=new Element('root'),stack=[root];
    for(const m of markup.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+|</g)){
      const t=m[0],p=stack.at(-1);
      if(t.startsWith('<!'))continue;
      if(t.startsWith('</')){
        const name=t.slice(2,-1).trim().toUpperCase();
        const i=stack.findLastIndex(x=>x.tagName===name);
        if(i>0)stack.length=i;continue;
      }
      if(/^<[a-zA-Z]/.test(t)){
        const [,name,attr]=/^<([\w:-]+)\s*([^>]*)>/.exec(t)||['','div',''];
        const node=new Element(name,attrsOf(attr));p.append(node);
        if(!VOID.has(name.toLowerCase())&&!t.endsWith('/>'))stack.push(node);
      }else if(t.trim()){
        const text=new Element('#text');text.ownText=t;p.append(text);
      }
    }
    return root.kids;
  }
  const document=new Element('document');
  document.append(...parse(html));
  document.body=document.querySelector('body');
  document.head=document.querySelector('head');
  document.documentElement=document.querySelector('html');
  document.getElementById=id=>document.querySelector('#'+id);
  document.createElement=name=>new Element(name);
  document.createTextNode=str=>{const n=new Element('#text');n.textContent=str;return n;};
  document.hidden=false;
  document.exitPointerLock=()=>{};
  document.elementFromPoint=()=>null;
  let date=new Date(iso).getTime(),performanceClock=1000;
  const FakeDate=class extends Date{
    constructor(...args){super(...(args.length?args:[date]));}
    static now(){return date;}
  };
  const log=[];
  const local=storage(save);
  const safeConsole={log:()=>{},warn:(...a)=>log.push(a.map(String).join(' ')),error:(...a)=>log.push(a.map(e=>e?.stack||String(e)).join(' ')),info:()=>{}};
  const window=new Element('window');
  const box={Element,HTMLElement:Element,HTMLCanvasElement:Element,document,localStorage:local,sessionStorage:storage(),
    navigator:{userAgent:'Headless QA',hardwareConcurrency:8,deviceMemory:8,maxTouchPoints:0},
    innerWidth:1200,innerHeight:800,screen:{width:1200,height:800,orientation:{type:'landscape-primary',addEventListener(){}}},
    devicePixelRatio:1,performance:{now:()=>performanceClock},location:{href:'http://crown-test.invalid/',origin:'http://crown-test.invalid',hostname:'crown-test.invalid',protocol:'http:',search:''},
    crypto:require('node:crypto').webcrypto,URL,URLSearchParams,AbortController,TextEncoder,TextDecoder,Blob,Date:FakeDate,console:safeConsole,
    setTimeout(){return 1},clearTimeout(){},setInterval(){return 1},clearInterval(){},requestAnimationFrame(){return 1},cancelAnimationFrame(){},
    matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),fetch:()=>Promise.reject(new Error('network disabled in QA')),
    Event:class{constructor(type){this.type=type;}preventDefault(){}}, Option:class extends Element{constructor(t,v){super('option',{value:v});this.textContent=t;}},
    Image:class extends Element{constructor(){super('img');}},IntersectionObserver:class{observe(){}unobserve(){}disconnect(){}},
    ResizeObserver:class{observe(){}disconnect(){}},confirm:()=>true,alert:()=>{},isSecureContext:true,
    getComputedStyle:e=>e.style,addEventListener:window.addEventListener.bind(window),removeEventListener(){},
    visualViewport:{width:1200,height:800,addEventListener(){},removeEventListener(){}}
  };
  if(network){
    box.fetch=(url,opt)=>String(url).startsWith(network.origin+'/rx-api/')?fetch(url,opt):Promise.reject(new Error('unrelated network disabled'));
    box.WebSocket=WebSocket;
    box.location={href:network.origin+'/',origin:network.origin,hostname:'localhost',protocol:'http:',search:''};
  }
  box.window=box;box.self=box;
  const ctx=vm.createContext(box);
  const script=source.match(/<script>([\s\S]*?)<\/script>/)[1];
  const withBridge=script.replace(/\n\}\)\(\);\s*$/, ()=>'\n'+bridge+'\n})();');
  new vm.Script(withBridge,{filename:'index.html'}).runInContext(ctx);
  return {ui:document,api:ctx.crownTest,log,local,time:t=>{date=new Date(t).getTime()},perf:t=>{performanceClock=t},ctx};
}

module.exports={makeHarness};
