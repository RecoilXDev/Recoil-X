// RECOIL X Z.5 - Integrated, in-game navigation.
// No floating Z.5 LAB or administrator buttons. Original game modes are preserved.
(()=>{
'use strict';
if(window.RXZ5InGame)return;
const css=document.createElement('style');
css.textContent=[
 '#rx5-native-main{margin:12px 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}',
 '#rx5-native-main button,#rx5-native-advanced button,#rx5-native-pause button{min-height:44px;border:1px solid #317a9b;border-radius:10px;padding:10px 12px;background:linear-gradient(115deg,#103952,#142b46);color:#eafaff;font:750 13px system-ui;cursor:pointer}',
 '#rx5-native-main button:focus-visible,#rx5-native-advanced button:focus-visible,#rx5-native-pause button:focus-visible{outline:3px solid #65e4e8}',
 '#rx5-native-advanced{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:14px 0}',
 '#rx5-native-pause{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin:10px 0}',
 '#rx5-native-main button[data-rx-admin-only],#rx5-native-advanced button[data-rx-admin-only],#rx5-native-pause button[data-rx-admin-only]{border-color:#d7b15b;color:#ffe0a1}',
 '[data-rx-admin-only][hidden]{display:none!important}',
 '#rxSimplePanel #rx5-native-main{margin-top:12px}',
 '@media(max-width:430px){#rx5-native-main{grid-template-columns:repeat(2,minmax(0,1fr))}#rx5-native-main button{font-size:12px;padding:9px}}'
].join('');
document.head.append(css);
const simple=document.getElementById('rxSimpleActions'),menu=document.getElementById('mainMenu'),pause=document.getElementById('pauseMenu');
if(!simple||!menu||!pause)return;
const group=(id,parent,before)=>{
 const node=document.createElement('div');node.id=id;node.setAttribute('aria-label','RECOIL X game features');
 if(before)parent.insertBefore(node,before);else parent.appendChild(node);
 return node;
};
const simpleGroup=group('rx5-native-main',simple,document.getElementById('rx5Accessibility'));
const advancedGroup=group('rx5-native-advanced',menu);
const pauseGroup=group('rx5-native-pause',pause,document.getElementById('spectateBtn'));
const buttons=[
 {key:'career',label:'🏅 Career & Clans'},
 {key:'market',label:'⚒️ Forge & Market'},
 {key:'matches',label:'🎮 Match Hub'},
 {key:'admin',label:'🛡 Admin',admin:true}
];
for(const parent of [simpleGroup,advancedGroup,pauseGroup]){
 for(const item of buttons){
   const button=document.createElement('button');button.type='button';button.textContent=item.label;
   button.dataset.rx5Open=item.key;
   if(item.admin){button.dataset.rxAdminOnly='';button.hidden=true;button.setAttribute('aria-label','Admin controls');}
   button.addEventListener('click',()=>open(item.key));
   parent.appendChild(button);
 }
}
function currentToken(){return sessionStorage.getItem('rx5-token')||'';}
function career(){if(!window.RXZ5Career)throw Error('Game account features are unavailable.');return window.RXZ5Career.open();}
async function open(key){
 try{
   if(key==='admin')return await window.RXZ5Admin?.open();
   if(key==='career'||!currentToken())return await career();
   if(key==='market'){if(!window.RXZ5Economy)throw Error('Forge is unavailable.');return await window.RXZ5Economy.open();}
   if(key==='matches'){if(!window.RXZ5MatchHub)throw Error('Match Hub is unavailable.');return await window.RXZ5MatchHub.open();}
 }catch(error){console.warn('RECOIL X menu action failed:',error);await career();}
}
window.RXZ5InGame={open};
window.RXZ5Admin?.refresh();
})();
