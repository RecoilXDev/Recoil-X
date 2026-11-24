// Account-owned, bounded Curator projects. No executable user content or ranked rewards.
import {randomBytes} from 'node:crypto';
export const TYPES=Object.freeze(['block','wall','ramp','spawn','target','hazard','tree']);
export function validateProject(input,fail){
 const bad=m=>{throw fail(400,m)};
 const name=typeof input.name==='string'?input.name.trim():'';
 if(!name||name.length>48)bad('Name must contain 1–48 characters.');
 if(!['collect','survive','explore'].includes(input.mode))bad('Invalid game mode.');
 if(!Number.isInteger(input.seconds)||input.seconds<15||input.seconds>300)bad('Time must be 15–300 seconds.');
 if(!Array.isArray(input.objects)||input.objects.length>64)bad('Use at most 64 objects.');
 const cells=new Set();
 const objects=input.objects.map(o=>{
  if(!o||!TYPES.includes(o.type)||!Number.isInteger(o.x)||!Number.isInteger(o.z)||Math.abs(o.x)>8||Math.abs(o.z)>8)bad('Invalid object.');
  const k=o.x+','+o.z;if(cells.has(k))bad('Only one object per cell.');cells.add(k);
  return {type:o.type,x:o.x,z:o.z};
 });
 if(objects.filter(o=>o.type==='spawn').length!==1)bad('Place exactly one spawn.');
 if(input.mode==='collect'&&!objects.some(o=>o.type==='target'))bad('Collect mode requires a target.');
 return {name,mode:input.mode,seconds:input.seconds,objects};
}
export function createCurator(db,fail){
 db.exec(`CREATE TABLE IF NOT EXISTS a_curator_projects (
 id TEXT PRIMARY KEY, owner INTEGER NOT NULL REFERENCES users(id), data TEXT NOT NULL,
 updated INTEGER NOT NULL, published INTEGER NOT NULL DEFAULT 0
 ); CREATE INDEX IF NOT EXISTS a_curator_owner ON a_curator_projects(owner,updated);`);
 const q=s=>db.prepare(s);
 const row=r=>({id:r.id,...JSON.parse(r.data),updated:r.updated,published:!!r.published});
 const own=(u,id)=>{
  if(typeof id!=='string'||!/^[a-f0-9]{16}$/.test(id))throw fail(400,'Invalid project ID.');
  const r=q('SELECT * FROM a_curator_projects WHERE id=? AND owner=?').get(id,u.id);
  if(!r)throw fail(404,'Project not found.');return r;
 };
 return {
  list(u){return {projects:q('SELECT * FROM a_curator_projects WHERE owner=? ORDER BY updated DESC LIMIT 20').all(u.id).map(row)}},
  shared(id){if(typeof id!=='string'||!/^[a-f0-9]{16}$/.test(id))throw fail(400,'Invalid share code.');
   const r=q('SELECT * FROM a_curator_projects WHERE id=? AND published=1').get(id);
   if(!r)throw fail(404,'Shared project not found.');return {project:row(r)};
  },
  save(u,b){const p=validateProject(b,fail),data=JSON.stringify(p),now=Date.now();
   if(b.id){const r=own(u,b.id);q('UPDATE a_curator_projects SET data=?,updated=?,published=0 WHERE id=? AND owner=?').run(data,now,r.id,u.id);return {project:row(own(u,r.id))};}
   if(q('SELECT COUNT(*) AS n FROM a_curator_projects WHERE owner=?').get(u.id).n>=20)throw fail(409,'Project limit reached (20).');
   const id=randomBytes(8).toString('hex');q('INSERT INTO a_curator_projects(id,owner,data,updated) VALUES(?,?,?,?)').run(id,u.id,data,now);return {project:row(own(u,id))};
  },
  share(u,b){const r=own(u,b.id);if(typeof b.published!=='boolean')throw fail(400,'Invalid share setting.');
   q('UPDATE a_curator_projects SET published=? WHERE id=? AND owner=?').run(+b.published,r.id,u.id);return {project:row(own(u,r.id))};
  },
  remove(u,b){const r=own(u,b.id);q('DELETE FROM a_curator_projects WHERE id=? AND owner=?').run(r.id,u.id);return {ok:true};}
 };
}
