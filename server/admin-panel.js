(() => {
  'use strict';
  if(window.RecoilAdmin4)return;
  const tabs=[['overview','Overview','◉'],['players','Players','◎'],['reports','Reports','▤'],['wallet','Wallet','◇'],['audit','Audit','≡'],['server','Server','▥']];
  let bridge,owner,dialog,main,nav,status,confirmation,heading,identity,returnTo;
  let page='overview',generation=0,active=false,selected='',caseId=null,pending=null;
  const filters={players:'all',prefix:'',reports:'open',wallet:'',actor:'',target:'',category:'all'};
  let playerPage=0,reportPage=null;
  const date=ms=>ms==null?'—':new Date(ms).toLocaleString();
  const number=value=>Number(value||0).toLocaleString();
  const actionLabels={'coins-grant':'Bonus coins granted','coins-reverse':'Coin grant reversed','staff-note':'Staff note','case-note':'Case note',warn:'Private warning',claim:'Case claimed',release:'Case released',resolve:'Case resolved',reopen:'Case reopened',unmute:'Chat mute lifted',unban:'Ban lifted',tempban:'Temporary ban',backup:'Private backup requested'};
  const title=value=>actionLabels[value]||String(value||'').replace(/[-_]/g,' ').replace(/^./,c=>c.toUpperCase());
  const query=fields=>new URLSearchParams(Object.entries(fields).filter(([,v])=>v!=null&&v!=='')).toString();
  const signed=()=>active&&bridge?.account()?.admin&&bridge.account().id===owner;
  function el(tag,text='',cls='') {
    const node=document.createElement(tag);
    if(text!=='')node.textContent=String(text);
    if(cls)node.className=cls;
    return node;
  }
  function btn(label,fn,cls='') {
    const node=el('button',label,('rx-btn '+cls).trim());
    node.type='button';node.onclick=fn;return node;
  }
  function actions(...children){const box=el('div','','rx-actions');box.append(...children);return box;}
  function card(parent,name){const block=el('section','','rx-card');if(name)block.append(el('h2',name));parent.append(block);return block;}
  function field(parent,label,options={}) {
    const wrap=el('label',label),input=el(options.items?'select':options.multiline?'textarea':'input');
    if(options.items)for(const [v,t] of options.items){const opt=el('option',t);opt.value=v;input.append(opt);}
    else if(!options.multiline)input.type=options.type||'text';
    if(options.maxLength)input.maxLength=options.maxLength;
    if(options.min!=null)input.min=options.min;
    if(options.max!=null)input.max=options.max;
    input.required=!!options.required;input.setAttribute('aria-label',label);
    if(options.value!=null)input.value=String(options.value);
    wrap.append(input);parent.append(wrap);return input;
  }
  function form(parent){const node=el('form','','rx-form');parent.append(node);return node;}
  function submit(node,label,fn,cls='primary') {
    const button=btn(label,null,cls);button.type='submit';node.append(actions(button));
    node.onsubmit=event=>{event.preventDefault();fn();};return button;
  }
  function row(parent,primary,detail,action,flag) {
    const line=el('article','','rx-row'),text=el('div');
    const name=el('strong',primary);if(flag)name.append(el('span',flag,'rx-flag'));text.append(name);if(detail)text.append(el('p',detail,'rx-meta rx-text'));
    line.append(text);if(action)line.append(action);parent.append(line);
  }
  function stats(parent,values){
    const box=el('div','','rx-metrics');for(const [label,value] of values){
      const item=el('div','','rx-stat');item.append(el('small',label),el('strong',value));box.append(item);
    }parent.append(box);
  }
  function message(text='',error=false){status.textContent=text;status.classList.toggle('error',error);}
  function dismiss(){pending=null;confirmation.hidden=true;confirmation.replaceChildren();}
  function close(){
    if(!active)return;
    active=false;++generation;dismiss();main.replaceChildren();message();identity.textContent='';
    selected='';caseId=null;playerPage=0;reportPage=null;
    Object.assign(filters,{players:'all',prefix:'',reports:'open',wallet:'',actor:'',target:'',category:'all'});
    if(dialog.open&&typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
    if(returnTo?.isConnected)returnTo.focus();returnTo=null;bridge=null;owner=null;
  }
  async function read(path,render){
    const ticket=generation;
    try{const data=await bridge.request(path);if(signed()&&ticket===generation)render(data);}
    catch(error){if(active&&ticket===generation){if(error.status===401||error.status===403)close();else message(error.message,true);}}
  }
  function review(label,detail,path,payload,done){
    if(!signed())return;
    dismiss();confirmation.hidden=false;
    const ticket=generation,job={running:false};pending=job;
    const cancel=btn('Cancel',dismiss),apply=btn('Confirm',async()=>{
      if(!signed()||ticket!==generation||pending!==job||job.running)return;
      job.running=true;apply.disabled=true;cancel.disabled=true;
      try{
        const result=await bridge.request(path,payload);
        if(!signed()||ticket!==generation||pending!==job)return;
        dismiss();if(done)done(result);else visit(page,label+' saved.');
      }catch(error){
        if(!active||ticket!==generation||pending!==job)return;
        if(error.status===401){close();return;}
        message(error.message,true);job.running=false;apply.disabled=false;cancel.disabled=false;
      }
    },'primary');
    confirmation.append(el('strong',label),el('p',detail,'rx-text'),actions(cancel,apply));
    cancel.focus();
  }
  function openPlayer(name){selected=name;visit('players');}
  function openCase(id){caseId=id;visit('reports');}
  function mount(){
    dialog=el('dialog');dialog.id='rx4-console';dialog.lang='en';dialog.dir='ltr';dialog.setAttribute('aria-labelledby','rx4-heading');
    const shell=el('div','','rx-shell'),rail=el('aside','','rx-rail'),brand=el('div','RECOIL ','rx-brand');
    brand.append(el('b','X'),el('span','Z.4','rx-release'));
    nav=el('nav');nav.setAttribute('aria-label','Staff sections');
    for(const [id,label,icon] of tabs){
      const button=btn('',()=>{if(id==='reports')caseId=null;visit(id);});
      button.className='rx-tab';button.dataset.page=id;
      const mark=el('span',icon,'rx-symbol');mark.setAttribute('aria-hidden','true');button.append(mark,el('span',label));nav.append(button);
    }
    identity=el('p','','rx-identity');rail.append(brand,nav,identity);
    const body=el('div','','rx-body'),top=el('header','','rx-top');
    heading=el('h1','Admin console');heading.id='rx4-heading';const titles=el('div');titles.append(el('span','Admin console','rx-context'),heading);top.append(titles,btn('Close',close));
    status=el('div','','rx-notice');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    main=el('div','','rx-main');confirmation=el('div','','rx-confirm');confirmation.hidden=true;confirmation.setAttribute('aria-label','Confirm staff action');
    body.append(top,status,main,confirmation);shell.append(rail,body);dialog.append(shell);document.body.append(dialog);
    dialog.addEventListener('cancel',e=>{e.preventDefault();if(pending&&!pending.running)dismiss();else close();});
    dialog.addEventListener('close',()=>{if(active&&!dialog.open)close();});
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.addEventListener('pointerdown',e=>e.stopPropagation());
  }
  function open(connection){
    if(!connection.account()?.admin)return;
    if(active)close();if(!dialog)mount();
    bridge=connection;owner=bridge.account().id;active=true;returnTo=document.activeElement;
    identity.textContent='Signed in · '+bridge.account().name;
    if(document.pointerLockElement)document.exitPointerLock?.();
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    visit('overview');
  }
  function visit(id,notice=''){
    if(!signed()){close();return;}
    page=id;++generation;dismiss();message(notice);main.replaceChildren();
    for(const b of nav.children){if(b.dataset.page===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
    heading.textContent=tabs.find(t=>t[0]===id)[1];main.scrollTop=0;
    ({overview,players,reports,wallet,audit,server})[id]();
  }
  function overview(){
    const metrics=el('div');main.append(metrics);
    read('/admin/overview',d=>stats(metrics,[['Online',number(d.online)],['Players',number(d.total)],['Open reports',number(d.openReports)],['Urgent cases',number(d.urgentReports)]]));
    const book=card(main,'Report inbox');
    read('/admin/reports?group=open',d=>{
      if(!d.reports.length)book.append(el('p','No open reports.','rx-meta'));
      for(const r of d.reports.slice(0,3))row(book,'#'+r.id+' · '+r.target,r.reason,btn('Review',()=>openCase(r.id)),r.priority?'Urgent':'');
      book.append(actions(btn('Open inbox',()=>{caseId=null;visit('reports');})));
    });
    const recent=card(main,'Recent staff activity');
    read('/admin/audit',d=>{
      if(!d.actions.length)recent.append(el('p','No staff actions recorded.','rx-meta'));
      for(const a of d.actions.slice(0,4))row(recent,title(a.kind)+(a.target?' · '+a.target:''),a.actor+' · '+date(a.created));
    });
  }
  function players(){
    const directory=card(main,'Player directory'),search=form(directory),grid=el('div','','rx-grid');search.append(grid);
    const prefix=field(grid,'Name starts with',{value:filters.prefix,maxLength:64});
    const group=field(grid,'Show players',{value:filters.players,items:[['all','All players'],['online','Online now'],['restricted','Active bans or mutes'],['admins','Administrators']]});
    submit(search,'Search players',()=>{filters.prefix=prefix.value.trim();filters.players=group.value;playerPage=0;visit('players');});
    const list=el('div');directory.append(list);
    read('/admin/players?'+query({q:filters.prefix,group:filters.players,after:playerPage}),d=>{
      if(!d.players.length)list.append(el('p','No matching players.','rx-meta'));
      for(const p of d.players)row(list,p.name,[p.admin?'Admin':'Player',p.online?'Online':'Offline'].join(' · '),btn('Inspect',()=>openPlayer(p.name)));
      if(playerPage)list.append(btn('First page',()=>{playerPage=0;visit('players');}));
      if(d.next)list.append(btn('Next players',()=>{playerPage=d.next;visit('players');}));
    });
    if(!selected)return;
    const details=card(main,selected);
    read('/admin/player?'+query({name:selected}),d=>{
      const p=d.player;
      details.append(el('p',(p.admin?'Administrator':'Player')+' · '+(p.online?'Online':'Offline')+' · '+number(p.coins)+' bonus coins','rx-meta'));
      for(const [on,reason,until,label] of [[p.banned,p.banReason,p.banUntil,'Ban'],[p.muted,p.muteReason,p.muteUntil,'Mute']])
        if(on)row(details,label+' active',reason+' · '+(until?'Until '+date(until):'Indefinite'));
      details.append(actions(btn('Player history',()=>{filters.target=p.name;filters.actor='';filters.category='all';visit('audit');}),btn('Open wallet',()=>{filters.wallet=p.name;visit('wallet');})));
      const edit=form(details),opts=[['staff-note','Private staff note']];
      if(!p.admin)opts.push(['warn','Send private warning'],['kick','Kick player'],['tempban','Temporary ban'],['ban','Permanent ban'],['unban','Unban player'],['timed-mute','Timed chat mute'],['mute','Indefinite chat mute'],['unmute','Unmute player']);
      const action=field(edit,'Player action',{items:opts}),duration=field(edit,'Duration in minutes',{type:'number',min:1,max:43200,value:60});
      const why=field(edit,'Reason or staff note',{multiline:true,maxLength:240,required:true});
      const showDuration=()=>{const timed=['tempban','timed-mute'].includes(action.value);duration.parentElement.hidden=!timed;duration.required=timed;};action.onchange=showDuration;showDuration();
      submit(edit,'Review action',()=>{
        const kind=action.value,note=why.value.trim(),label=opts.find(pair=>pair[0]===kind)[1];
        if(kind==='warn'||kind==='staff-note')review(label,p.name+' · '+note,'/admin/note',{kind,name:p.name,reason:note});
        else review(label,p.name+' · '+note+(duration.required?' · '+duration.value+' min':''),'/z2/admin/action',{action:kind==='timed-mute'?'mute':kind,name:p.name,minutes:duration.required?Number(duration.value):null,reason:note});
      });
      details.scrollIntoView?.({block:'nearest'});
    });
  }
  function reports(){
    if(caseId){showCase();return;}
    const inbox=card(main,'Report queue'),f=form(inbox);
    const group=field(f,'Queue',{value:filters.reports,items:[['open','Open cases'],['urgent','Urgent cases'],['mine','Assigned to me'],['closed','Closed cases'],['all','All cases']]});
    submit(f,'Show cases',()=>{filters.reports=group.value;reportPage=null;visit('reports');});
    read('/admin/reports?'+query({group:filters.reports,before:reportPage}),d=>{
      if(!d.reports.length)inbox.append(el('p','No cases in this queue.','rx-meta'));
      for(const r of d.reports)row(inbox,'#'+r.id+' · '+r.target,(r.priority?'Urgent · ':'')+(r.owner||'Unassigned')+' · '+r.reason,btn('Open case',()=>openCase(r.id)));
      if(reportPage)inbox.append(btn('Newest cases',()=>{reportPage=null;visit('reports');}));
      if(d.next)inbox.append(btn('Older cases',()=>{reportPage=d.next;visit('reports');}));
    });
  }
  function showCase(){
    main.append(actions(btn('Back to inbox',()=>{caseId=null;visit('reports');})));
    const block=card(main,'Case #'+caseId);
    read('/admin/case?'+query({id:caseId}),d=>{
      const r=d.report,closed=r.closedAt!=null;
      row(block,r.target,(closed?'Closed':'Open')+' · '+(r.priority?'Urgent':'Normal')+' · '+(r.owner||'Unassigned'),btn('Inspect player',()=>openPlayer(r.target)));
      block.append(el('p',r.reason,'rx-text'),el('p','Reported by '+r.reporter+' · '+date(r.created),'rx-meta'));
      const change=(kind,label,payload={})=>review(label,'Case #'+r.id+' · '+r.target+(payload.reason?' · '+payload.reason:''),'/admin/case',{kind,reportId:r.id,...payload});
      if(!closed){
        const tools=actions();
        if(!r.owner)tools.append(btn('Claim case',()=>change('claim','Claim case')));
        if(r.owner===bridge.account().name)tools.append(btn('Release case',()=>change('release','Release case')));
        tools.append(btn(r.priority?'Set normal priority':'Mark urgent',()=>change('priority',r.priority?'Set normal priority':'Mark urgent',{urgent:!r.priority})));block.append(tools);
      }
      const edit=form(block),mode=field(edit,'Case action',{items:closed?[['reopen','Reopen case']]:[['case-note','Add case note'],['resolve','Resolve case']]});
      const why=field(edit,'Case note or reason',{multiline:true,required:true,maxLength:240});
      submit(edit,'Review case action',()=>change(mode.value,mode.options[mode.selectedIndex].textContent,{reason:why.value.trim()}));
      const history=card(main,'Case timeline');row(history,'Report received',r.reporter+' · '+date(r.created));
      if(r.matchId){row(history,'Linked match',r.matchId);for(const e of d.evidence)row(history,title(e.kind),e.label+' · '+Math.round(e.at/1000)+'s');}
      for(const n of d.notes)row(history,title(n.kind),n.actor+' · '+date(n.created)+' · '+n.reason);
    });
  }
  function wallet(){
    const finder=card(main,'Bonus wallets'),f=form(finder),name=field(f,'Exact player name',{value:filters.wallet,maxLength:18});
    submit(f,'Find wallet',()=>{filters.wallet=name.value.trim();visit('wallet');});
    if(filters.wallet)read('/admin/player?'+query({name:filters.wallet}),d=>stats(finder,[['Player',d.player.name],['Bonus coins',number(d.player.coins)]]));
    const award=card(main,'Grant bonus coins');
    award.append(el('p','Grants go to the player’s server bonus wallet. The legacy shop uses local coins.','rx-meta'));
    const edit=form(award),grid=el('div','','rx-grid');edit.append(grid);
    const to=field(grid,'Recipient',{value:filters.wallet,maxLength:18,required:true}),amount=field(grid,'Coins',{type:'number',min:1,max:1000000,required:true});
    const why=field(edit,'Grant reason',{multiline:true,maxLength:240,required:true});
    let previous='',key='';
    submit(edit,'Review grant',()=>{
      const data={name:to.value.trim(),amount:Number(amount.value),reason:why.value.trim()},signature=JSON.stringify(data);
      if(signature!==previous){key=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');previous=signature;}
      review('Grant '+number(data.amount)+' bonus coins',data.name+' · '+data.reason,'/admin/coins',{...data,requestId:key},result=>{filters.wallet=result.name;visit('wallet','Grant #'+result.grantId+' recorded.');});
    });
    const history=card(main,filters.wallet?'Grants for '+filters.wallet:'Recent grants');
    read('/admin/ledger?'+query({name:filters.wallet}),d=>{
      if(!d.grants.length)history.append(el('p','No grants found.','rx-meta'));
      for(const g of d.grants){
        const line=el('div');history.append(line);
        const detail=g.actor+' · '+date(g.created)+' · '+g.reason+(g.reversedAt?' · Reversed by '+g.reversedBy+' · '+g.reversalReason:'');
        row(line,'#'+g.id+' · '+g.target+' · '+number(g.amount)+' coins',detail,g.reversedAt?null:btn('Reverse grant',()=>{
          line.replaceChildren();const undo=form(line),why=field(undo,'Reason for reversing grant #'+g.id,{multiline:true,maxLength:240,required:true});
          submit(undo,'Review reversal',()=>review('Reverse grant #'+g.id,g.target+' · '+number(g.amount)+' coins · '+why.value,'/admin/reverse',{grantId:g.id,reason:why.value.trim()}),'danger');
          undo.append(btn('Cancel reversal',()=>visit('wallet')));why.focus();
        }));
      }
    });
  }
  function audit(){
    const find=card(main,'Staff audit log'),f=form(find),grid=el('div','','rx-grid');f.append(grid);
    const actor=field(grid,'Admin name',{value:filters.actor,maxLength:18}),target=field(grid,'Player name',{value:filters.target,maxLength:18});
    const group=field(grid,'Action group',{value:filters.category,items:[['all','All actions'],['moderation','Moderation'],['cases','Reports'],['wallet','Bonus wallet'],['staff','Staff notes and operations']]});
    submit(f,'Apply audit filters',()=>{filters.actor=actor.value.trim();filters.target=target.value.trim();filters.category=group.value;visit('audit');});
    const result=card(main,'Matching entries');
    read('/admin/audit?'+query({actor:filters.actor,target:filters.target,group:filters.category}),d=>{
      if(!d.actions.length){result.append(el('p','No matching entries.','rx-meta'));return;}
      result.append(actions(btn('Export these entries',()=>{
        const url=URL.createObjectURL(new Blob([JSON.stringify(d.actions,null,2)],{type:'application/json'}));
        const a=el('a');a.href=url;a.download='RECOIL-X-Z4-staff-audit.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      })));
      for(const a of d.actions)row(result,title(a.kind)+(a.target?' · '+a.target:''),a.actor+' · '+date(a.created)+' · '+a.reason,a.report?btn('Open case',()=>openCase(a.report)):null);
    });
  }
  function server(){
    const vitals=card(main,'Server health');
    vitals.append(actions(btn('Refresh measurements',()=>visit('server'))));
    read('/asc/health',d=>{
      stats(vitals,[['Connected players',number(d.players)],['Rooms',number(d.rooms+d.legacyRooms)],['Active matches',number(d.playing)],['Memory',number(d.memoryMiB)+' MiB'],
        ['Median round trip',d.rttMs==null?'No sample':d.rttMs+' ms'],['Uptime',Math.floor(d.uptimeSeconds/60)+' min'],['Disconnects',number(d.disconnects)],['Errors',number(d.errors)]]);
      const snapshot=card(main,'Private database backups');row(snapshot,'Status · '+d.backups.state,'Last verified copy · '+date(d.backups.last));
      if(d.backups.failedAt)row(snapshot,'Last failure',date(d.backups.failedAt));
      const f=form(snapshot),reason=field(f,'Backup reason',{maxLength:240,required:true});
      submit(f,'Request a private backup',()=>review('Create a verified private backup',reason.value,'/admin/backup',{reason:reason.value.trim()},out=>visit('server','Backup request recorded · '+out.state)));
      const alerts=card(main,'Movement reviews');
      if(!d.movementReviews.length)alerts.append(el('p','No movement alerts recorded.','rx-meta'));
      for(const a of d.movementReviews)row(alerts,a.name,title(a.kind)+' · '+date(a.created),btn('Inspect player',()=>openPlayer(a.name)));
    });
  }
  window.RecoilAdmin4=Object.freeze({open,close});
})();
