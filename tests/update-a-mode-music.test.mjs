import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const slice=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+1);assert(i>=0&&j>i);return html.slice(i,j);};
const audio=new Function(slice('const SOUNDTRACK=','window.RecoilCityGame =')+'\nreturn {SOUNDTRACK,RX_A_MUSIC_PROFILES,rxAModeScore};')();
const modes=[...new Set(['Z1_MODE_NAMES','Z2_MODES'].flatMap(n=>{const start=html.indexOf('const '+n+'={'),end=html.indexOf('};',start);return Object.keys(new Function('return '+html.slice(start+n.length+7,end+1))());}))];
test('every registered FPS mode has a distinct procedural score',()=>{assert(modes.length>=66);const tracks=modes.map(id=>{assert(Object.hasOwn(audio.RX_A_MUSIC_PROFILES,id),id);const key=audio.rxAModeScore(id),song=audio.SOUNDTRACK[key];assert.equal(song.bass.length,16);assert.equal(song.lead.length,16);assert(song.tempo>=60&&song.tempo<=180);assert.equal(audio.rxAModeScore(id),key);return JSON.stringify(song);});assert.equal(new Set(tracks).size,modes.length);});
test('future modes receive valid original scores',()=>{for(const id of ['future-arena','constructor','__proto__']){const song=audio.SOUNDTRACK[audio.rxAModeScore(id)];assert.equal(song.bass.length,16);assert(song.lead.every(Number.isFinite));}});
