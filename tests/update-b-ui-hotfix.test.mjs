import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),js=readFileSync(new URL('../server/z5-ingame.js',import.meta.url),'utf8');
test('Sand overlay applies only when Sand is selected',()=>{assert.match(js,/body\.rx5-sand-ui\[data-b-theme=sand\]/);assert.doesNotMatch(js,/body\.rx5-sand-ui(?!\[data-b-theme=sand\])/);assert.match(html,/body:not\(\[data-b-theme=sand\]\) #overlay \.crate-card/);});
test('gun cards use actual game meshes, bounded cache and fallback',()=>{assert.match(html,/v8DrawWeapon\(mesh,\{x:0,y:0,z:0,yaw:0,pitch:0,rigGrip:true,previewDetail:true\}/);assert.match(html,/bWeaponPreviewCache\.size>=64/);assert.match(html,/return v8FlatSvg\(f\)/);assert.match(html,/class="v8-gun-preview b-mesh-preview"/);assert.match(html,/art\.innerHTML=v8Svg\(\{\.\.\.r,gun:r\.slot/);});
test('coastal lobby stays active when opening existing panels',()=>{const code=html.slice(html.indexOf('function bOpenExisting('),html.indexOf('function bSyncLayout('));assert.doesNotMatch(code,/classList\.remove/);assert.match(code,/btn\.click\(\)/);});

test('HD artwork and full detail menu meshes without changing low graphics gameplay',()=>{for(const theme of ['aero','sand','zone90','metro','midnight','aurora','cyber','golden'])assert.ok(html.includes('body[data-b-theme='+theme+'],.b-reward[data-theme-id='+theme+'] {--b-theme-art:url'));assert.match(html,/width%3D%221920%22%20height%3D%221080%22/);assert.match(html,/owner\.previewDetail===true\|\|\(!rxTvUltraLight\(\)/);assert.match(html,/const m=vxKnifeMesh\(k,true\)/);assert.match(html,/ctx\.scale\(ratio,ratio\)/);});
