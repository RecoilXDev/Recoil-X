import { createServer } from 'node:http';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { migrateOverdrive, overdriveStore } from './overdrive-store.mjs';
import { migrateMissions, missionStore } from './mission-store.mjs';
import { createOverdrive } from './overdrive.mjs';
import { createAdminPatch } from './admin-patch.mjs';

const WebSocket = createRequire(import.meta.url)('faye-websocket');
const derive = promisify(scrypt);
const sessionAge = 14 * 24 * 3600 * 1000;
const userPattern = /^[\p{L}\p{N}_-]{3,18}$/u;
const hashToken = token => createHash('sha256').update(token).digest('hex');
const canonical = value => typeof value === 'string' ? value.trim().normalize('NFKC').toLowerCase() : '';
const sqlTime = () => Date.now();
const dummySalt = randomBytes(16).toString('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });
const offlineAssets = new Map([
  ['/manifest.webmanifest','application/manifest+json'], ['/sw.js','text/javascript; charset=utf-8'],
  ['/recoil-icon-192.png','image/png'], ['/recoil-icon-512.png','image/png']
]);

function roomPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

function openDb(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, handle TEXT NOT NULL UNIQUE,
      salt TEXT NOT NULL, secret TEXT NOT NULL, admin INTEGER NOT NULL DEFAULT 0,
      banned INTEGER NOT NULL DEFAULT 0, joins INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, account INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
    CREATE TABLE IF NOT EXISTS friends (
      lo INTEGER NOT NULL REFERENCES users(id), hi INTEGER NOT NULL REFERENCES users(id),
      requester INTEGER NOT NULL REFERENCES users(id), accepted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (lo,hi)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY, lo INTEGER NOT NULL, hi INTEGER NOT NULL, sender INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL, sent INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS message_history ON messages(lo,hi,id);
  `);
  return db;
}

async function readJson(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || ''))
    throw fail(415, 'Use JSON.');
  let text = '';
  for await (const part of req) {
    text += part;
    if (Buffer.byteLength(text) > 8192) throw fail(413, 'The request is too large.');
  }
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error();
    return data;
  } catch {
    throw fail(400, 'Invalid request.');
  }
}

const windowLimits = new Map();
function allowed(key, count, duration) {
  const now = sqlTime();
  let item = windowLimits.get(key);
  if (!item || item.until < now) {
    item = { count: 0, until: now + duration };
    windowLimits.set(key, item);
  }
  item.count++;
  return item.count <= count;
}

async function passwordHash(password, salt) {
  return (await derive(password, Buffer.from(salt, 'hex'), 64, {
    N: 1 << 17, r: 8, p: 1, maxmem: 160 * 1024 * 1024
  })).toString('hex');
}

export function createRecoilServer(options = {}) {
  const filename = options.database ?? 'recoil-x.sqlite';
  const existing = filename !== ':memory:' && existsSync(filename);
  const db = openDb(filename);
  try {
    const upgraded=migrateOverdrive(db,filename,existing);
    // One consistent backup covers every migration in this startup.
    migrateMissions(db,filename,existing&&!upgraded);
  }
  catch(error) {db.close();throw error;}
  const origins = new Set(options.origins ?? []);
  const htmlPath = options.html ?? new URL('../index.html', import.meta.url);
  const assetDirectory=dirname(htmlPath instanceof URL?fileURLToPath(htmlPath):htmlPath);
  const clients = new Map(), rooms = new Map();
  let passwordJobs = 0;
  let lastExpiry = 0;
  const overdriveData = overdriveStore(db,fail);
  const missions = missionStore(db,fail);
  const adminPatch = createAdminPatch(db,fail,()=>clients.size);
  const overdrive = createOverdrive({
    client:id=>clients.get(id),send,store:overdriveData,fail,allowed,leaveLegacy:leave,cleanChat
  });

  const st = sql => db.prepare(sql);
  const byName = st('SELECT * FROM users WHERE handle=?');
  const byId = st('SELECT * FROM users WHERE id=?');
  const findFriend = st('SELECT requester,accepted FROM friends WHERE lo=? AND hi=?');
  const session = st(`SELECT u.*,s.expires,s.token_hash FROM sessions s JOIN users u ON s.account=u.id
    WHERE s.token_hash=? AND s.expires>?`);
  const roster = st(`SELECT u.id,u.name,u.joins,u.banned,f.accepted,f.requester
    FROM friends f JOIN users u ON u.id=CASE WHEN f.lo=? THEN f.hi ELSE f.lo END WHERE f.lo=? OR f.hi=? ORDER BY u.handle`);

  function originOk(req) {
    const origin = req.headers.origin, host = req.headers.host;
    return !origin || origin === 'null' || origins.has(origin) ||
      origin === 'https://' + host || origin === 'http://' + host;
  }

  function cors(req, res) {
    res.setHeader('Vary', 'Origin');
    if (req.headers.origin && originOk(req)) res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if(req.headers['access-control-request-private-network']==='true'&&originOk(req))
      res.setHeader('Access-Control-Allow-Private-Network','true');
  }

  function authenticate(token) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw fail(401, 'Sign in first.');
    const user = session.get(hashToken(token), sqlTime());
    if (!user) throw fail(401, 'Sign in again.');
    verifyBan(user);
    return user;
  }

  function verifyBan(user) {
    const ban=overdriveData.activeBan(user.id,sqlTime());
    if (user.banned || ban) {
      const end=ban?.until ? ' until '+new Date(ban.until).toISOString() : '';
      throw fail(403,'This account is banned'+end+'.'+(ban?.reason?' '+ban.reason:''));
    }
  }

  const profile = user => ({ id:user.id, name:user.name, admin:!!user.admin, joins:!!user.joins });
  const isFriend = (a,b) => !!findFriend.get(...roomPair(a,b))?.accepted;
  function contact(user, name) {
    const row = byName.get(canonical(name));
    if (!row || row.id === user.id || overdriveData.banned(row.id,sqlTime())) throw fail(404, 'Player is unavailable.');
    return row;
  }

  function send(client, event) {
    if (client?.socket.readyState !== 1) return;
    const transport=client.transport;
    const replaceable=event.type==='z2:state'||(event.type==='relay'&&
      (event.packet?.t==='pos'||(event.packet?.t==='z1-frame'&&event.packet.phase==='playing')));
    if(replaceable&&(transport.writableNeedDrain||transport.writableLength>=8192))return;
    if(transport.writableLength>=400000){transport.destroy();return;}
    client.socket.send(JSON.stringify(event));
  }
  function refresh(userId) { send(clients.get(userId), { type:'refresh' }); }

  function leave(client, reason = 'left') {
    const host = client.room;
    if (!host) return;
    client.room = null;
    const room = rooms.get(host);
    if (!room) return;
    if (room.host === client.id) {
      rooms.delete(host);
      for (const id of room.members) {
        if (id === host) continue;
        const member = clients.get(id);
        if (member) member.room = null;
        send(member, { type:'room-closed', reason });
      }
      return;
    }
    room.members.delete(client.id);
    send(clients.get(host), { type:'member-left', user:client.id });
  }

  function cutConnection(client, message) {
    if (!client) return;
    leave(client, message);
    overdrive.disconnect(client);
    send(client, { type:'account-closed', message });
    if (clients.get(client.id) === client) clients.delete(client.id);
    client.socket.close(1000, 'Session ended');
  }

  async function credentials(req, body, signup) {
    const ip = req.socket.remoteAddress || '';
    if (!allowed('auth-ip:'+ip, 16, 60000)) throw fail(429, 'Wait a minute before trying again.');
    const name = typeof body.name === 'string' ? body.name.trim().normalize('NFKC') : '';
    const handle = canonical(name);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!userPattern.test(name) || password.length > 128 || password.length < (signup ? 10 : 1))
      throw fail(400, signup ? 'Use 3–18 letters, numbers, hyphens or underscores and a password of at least 10 characters.' : 'Enter your account name and password.');
    if (!allowed('auth-name:'+handle, 9, 60000)) throw fail(429, 'Wait a minute before trying again.');
    if (passwordJobs >= 3) throw fail(429, 'The server is busy. Try again in a moment.');
    let account = byName.get(handle);
    if (signup && account) throw fail(409, 'That account name is already taken.');
    const salt = signup ? randomBytes(16).toString('hex') : account?.salt || dummySalt;
    let secret;
    passwordJobs++;
    try { secret = await passwordHash(password, salt); }
    finally { passwordJobs--; }
    if (signup) {
      try { st('INSERT INTO users(name,handle,salt,secret) VALUES(?,?,?,?)').run(name,handle,salt,secret); }
      catch (error) {
        if (byName.get(handle)) throw fail(409, 'That account name is already taken.');
        throw error;
      }
      account = byName.get(handle);
    } else if (!account || !timingSafeEqual(Buffer.from(secret,'hex'),Buffer.from(account.secret,'hex'))) {
      throw fail(401, 'Account name or password is incorrect.');
    }
    verifyBan(account);
    const token = randomBytes(32).toString('hex');
    st('INSERT INTO sessions(token_hash,account,expires) VALUES (?,?,?)').run(hashToken(token),account.id,sqlTime()+sessionAge);
    return { token, user:profile(account) };
  }

  function directMessage(from, target, raw) {
    if (overdriveData.muted(from.id,sqlTime())) throw fail(403,'Your chat is muted.');
    if (!isFriend(from.id, target.id)) throw fail(403, 'Chat opens after the friend request is accepted.');
    const body = cleanChat(raw);
    if (!allowed('dm:'+from.id,12,10000)) throw fail(429, 'You are sending messages too quickly.');
    const [lo,hi] = roomPair(from.id,target.id), sent = sqlTime();
    const result = st('INSERT INTO messages (lo,hi,sender,body,sent) VALUES (?,?,?,?,?)').run(lo,hi,from.id,body,sent);
    st(`DELETE FROM messages WHERE lo=? AND hi=? AND id < (
      SELECT id FROM messages WHERE lo=? AND hi=? ORDER BY id DESC LIMIT 1 OFFSET 199
    )`).run(lo,hi,lo,hi);
    const message = { id:Number(result.lastInsertRowid), from:from.name, to:target.name, body, sent };
    send(clients.get(target.id),{type:'dm',message});
    return { message };
  }

  function cleanChat(raw) {
    const body = typeof raw === 'string' ? raw.replace(/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g,' ').trim() : '';
    if (!body || body.length > 240) throw fail(400, 'Write a message of 1–240 characters.');
    return body;
  }

  function doFriend(user, body) {
    const target = contact(user,body.name);
    const [lo,hi] = roomPair(user.id,target.id), current = findFriend.get(lo,hi);
    if (body.action === 'remove') {
      st('DELETE FROM friends WHERE lo=? AND hi=?').run(lo,hi);
      const a = clients.get(user.id), b = clients.get(target.id);
      for (const [guest,host] of [[a,target.id],[b,user.id]]) {
        if (guest?.room!==host) continue;
        leave(guest);
        send(guest,{type:'room-closed',reason:'You must be friends to stay in this party.'});
      }
    } else if (body.action === 'accept') {
      if (!current || current.requester === user.id) throw fail(409,'There is no incoming friend request.');
      st('UPDATE friends SET accepted=1 WHERE lo=? AND hi=?').run(lo,hi);
    } else if (body.action === 'request') {
      if (current && current.requester === target.id)
        st('UPDATE friends SET accepted=1 WHERE lo=? AND hi=?').run(lo,hi);
      else if (!current) {
        if (roster.all(user.id,user.id,user.id).length >= 200 || roster.all(target.id,target.id,target.id).length >= 200)
          throw fail(409,'The friends list is full.');
        st('INSERT INTO friends(lo,hi,requester) VALUES(?,?,?)').run(lo,hi,user.id);
      }
    } else throw fail(400,'Choose a friend action.');
    refresh(user.id);refresh(target.id);
    return { ok:true };
  }

  function moderate(user, body) {
    const now=sqlTime();
    const result=overdriveData.moderation(user,body,now);
    if (['kick','tempban','ban'].includes(result.action)) {
      const message=result.action==='kick'?'An administrator removed you from the server.':'This account is banned.';
      overdrive.drop(result.id,now,message);
      cutConnection(clients.get(result.id),message);
    }
    return result;
  }

  async function endpoint(req, path) {
    if ((path === '/register' || path === '/login') && req.method === 'POST')
      return credentials(req,await readJson(req),path === '/register');
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
    const body = req.method === 'POST' ? await readJson(req) : null;
    const user = authenticate(token);
    if (req.method === 'GET') {
      if (path === '/missions') return missions.read(user.id);
      if (path === '/me') return {user:profile(user)};
      if (path === '/z2/profile') return overdriveData.profile(user.id,sqlTime());
      if (path === '/z2/admin') return overdriveData.history(user);
      if (path === '/admin/overview') return adminPatch.overview(user);
      if (path === '/admin/ledger') return adminPatch.ledger(user);
      if (path === '/admin/player') return adminPatch.player(user,new URL(req.url,'http://localhost').searchParams.get('name'));
      if (path === '/z3/map') {
        if(!allowed('shared-map-read:'+user.id,30,60000))throw fail(429,'Wait before opening more maps.');
        return overdriveData.loadMap(new URL(req.url,'http://localhost').searchParams.get('code'));
      }
      if (path === '/friends') {
        const friends = roster.all(user.id,user.id,user.id).filter(row=>!overdriveData.banned(row.id,sqlTime())).map(row=>({
          name:row.name, status:row.accepted?'friend':row.requester===user.id?'sent':'incoming',
          online:!!row.accepted&&clients.has(row.id),
          playing:row.accepted&&row.joins ? rooms.get(row.id)?.label || '' : ''
        }));
        return { friends };
      }
      if (path === '/messages') {
        const params = new URL(req.url,'http://localhost').searchParams;
        const target = contact(user,params.get('with'));
        if (!isFriend(user.id,target.id)) throw fail(403,'Accept a friend request first.');
        const rows = st('SELECT id,sender,body,sent FROM messages WHERE lo=? AND hi=? ORDER BY id DESC LIMIT 50')
          .all(...roomPair(user.id,target.id)).reverse();
        return { messages:rows.map(m=>({id:m.id,from:m.sender===user.id?user.name:target.name,
          to:m.sender===user.id?target.name:user.name,body:m.body,sent:m.sent})) };
      }
    }
    if (req.method === 'POST') {
      if (path === '/missions') {
        if(!allowed('mission-save:'+user.id,160,60000))throw fail(429,'Mission saves are busy. Retry shortly.');
        return missions.write(user.id,body);
      }
      if (path === '/friends') return doFriend(user,body);
      if (path === '/messages') return directMessage(user,contact(user,body.name),body.body);
      if (path === '/ban') {
        const action=body.banned===false?'unban':'ban';
        return moderate(user,{name:body.name,action,reason:'Updated from the Friends moderation panel'});
      }
      if (path === '/z2/admin/action') return moderate(user,body);
      if (path === '/admin/coins') {
        if(!allowed('admin-coins:'+user.id,30,60000))throw fail(429,'Too many coin grants.');
        const grant=adminPatch.grantCoins(user,body,sqlTime());
        send(clients.get(grant.id),{type:'rx-admin:coins',coins:grant.coins,granted:grant.amount});
        return grant;
      }
      if (path === '/z2/report') return overdriveData.report(user,body,sqlTime());
      if (path === '/z3/map') {
        if(!allowed('shared-map-write:'+user.id,6,60000))throw fail(429,'Wait before sharing more maps.');
        return overdriveData.shareMap(user,body,sqlTime());
      }
      if (path === '/logout') {
        st('DELETE FROM sessions WHERE token_hash=?').run(user.token_hash);
        const active = clients.get(user.id);
        if (active?.tokenHash === user.token_hash) {
          overdrive.drop(user.id,sqlTime(),'Signed out.');
          cutConnection(active,'Signed out.');
        }
        return {ok:true};
      }
      if (path === '/settings') {
        if (typeof body.joins !== 'boolean') throw fail(400,'Choose whether friends can join.');
        st('UPDATE users SET joins=? WHERE id=?').run(Number(body.joins),user.id);
        const c = clients.get(user.id);
        if (!body.joins && c?.room===user.id) leave(c,'Friend joins turned off.');
        for (const row of roster.all(user.id,user.id,user.id)) if (row.accepted) refresh(row.id);
        return {user:profile(byId.get(user.id))};
      }
    }
    throw fail(404,'Unknown game service route.');
  }

  const server = createServer(async (req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    const path = new URL(req.url,'http://localhost').pathname;
    if(offlineAssets.has(path)){
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
      try{
        const data=readFileSync(resolve(assetDirectory,path.slice(1)));
        res.writeHead(200,{'Content-Type':offlineAssets.get(path),'Cache-Control':'no-cache'});
        res.end(req.method==='HEAD'?undefined:data);
      }catch{res.writeHead(404).end();}
      return;
    }
    if (path === '/admin-panel.js') {
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
      try{const js=readFileSync(new URL('./admin-panel.js',import.meta.url));
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-cache'});
        res.end(req.method==='HEAD'?undefined:js);
      }catch{res.writeHead(404).end();}return;
    }
    if (path === '/' || path === '/index.html') {
      if (req.method!=='GET'&&req.method!=='HEAD') {res.writeHead(405).end();return;}
      try {
        const html = readFileSync(htmlPath,'utf8').replace(/<\/body>/i,'<script src="/admin-panel.js" defer></script></body>');
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});
        res.end(req.method==='HEAD'?undefined:html);
      } catch {res.writeHead(404).end('Put index.html beside the server folder.');}
      return;
    }
    if (!path.startsWith('/rx-api/')) {res.writeHead(404).end();return;}
    cors(req,res);
    res.setHeader('Cache-Control','no-store');
    if (!originOk(req)) {res.writeHead(403).end();return;}
    if (req.method==='OPTIONS') {res.writeHead(204).end();return;}
    res.setHeader('Content-Type','application/json; charset=utf-8');
    try {
      const result = path==='/rx-api/health' ? {recoil:'Z.3',protocol:1,overdrive:1,missionLevels:500} : await endpoint(req,path.slice(7));
      res.end(JSON.stringify(result));
    } catch (error) {
      if (!error.status) console.error(error);
      res.statusCode = error.status || 500;
      res.end(JSON.stringify({error:error.status?error.message:'Game server error.'}));
    }
  });

  function socketPacket(c, data) {
    if (!allowed('wire:'+c.id,260,1000)) return;
    const current = session.get(c.tokenHash,sqlTime());
    if (!current || current.banned || overdriveData.activeBan(c.id,sqlTime())) {
      overdrive.drop(c.id,sqlTime(),'This session ended.');
      cutConnection(c,'Sign in again.');return;
    }
    if (typeof data.type==='string'&&data.type.startsWith('z2:')) {
      overdrive.packet(c,current,data);return;
    }
    if (data.type === 'leave') {leave(c);return;}
    if (data.type === 'host') {
      if (overdrive.inRoom(c.id)) throw fail(409,'Leave Overdrive before hosting a Friends match.');
      if (!current.joins) throw fail(403,'Friend joins are turned off.');
      const label = typeof data.label==='string' ? data.label.trim().slice(0,64) : '';
      if (!label) throw fail(400,'Playing mode is required.');
      if (c.room!==c.id) {
        leave(c);
        rooms.set(c.id,{host:c.id,label,members:new Set([c.id])});
        c.room=c.id;
      }
      const room=rooms.get(c.id);
      room.label=label;
      send(c,{type:'host-ready'});
      for (const row of roster.all(c.id,c.id,c.id)) if (row.accepted) refresh(row.id);
      return;
    }
    if (data.type === 'join') {
      if (overdrive.inRoom(c.id)) throw fail(409,'Leave Overdrive before joining a Friends match.');
      const target=contact(current,data.name),room=rooms.get(target.id);
      if (!target.joins || !isFriend(c.id,target.id) || !room) throw fail(409,'That friend’s match is unavailable.');
      if (c.room===target.id) return;
      if (room.members.size>=8) throw fail(409,'This match is full.');
      leave(c);
      room.members.add(c.id);c.room=target.id;
      send(c,{type:'joined',host:target.id,name:target.name,label:room.label});
      send(clients.get(target.id),{type:'member-joined',user:c.id,name:current.name});
      return;
    }
    const room=rooms.get(c.room);
    if (!room || !room.members.has(c.id)) return;
    if (data.type==='room-chat') {
      if (overdriveData.muted(c.id,sqlTime())) throw fail(403,'Your chat is muted.');
      if (!allowed('chat:'+c.id,12,10000)) throw fail(429,'You are sending messages too quickly.');
      const message={from:current.name,body:cleanChat(data.body),sent:sqlTime()};
      for (const id of room.members) send(clients.get(id),{type:'room-chat',message});
      return;
    }
    if (data.type!=='relay' || !data.packet || typeof data.packet!=='object') return;
    if (c.id!==room.host) {
      send(clients.get(room.host),{type:'relay',from:c.id,packet:data.packet});
      return;
    }
    if (data.to===undefined) {
      for (const id of room.members) if (id!==c.id) send(clients.get(id),{type:'relay',from:c.id,packet:data.packet});
    } else if (data.to!==c.id && room.members.has(data.to)) {
      send(clients.get(data.to),{type:'relay',from:c.id,packet:data.packet});
    }
  }

  server.on('upgrade',(req,socket,head)=>{
    if (req.url!=='/rx-live' || !originOk(req) || !WebSocket.isWebSocket(req) ||
      !allowed('upgrade:'+req.socket.remoteAddress,70,60000)) {socket.destroy();return;}
    const ws = new WebSocket(req,socket,head,null,{maxLength:65536,ping:20});
    let connected = null;
    const timeout = setTimeout(()=>{if (!connected) ws.close(1000,'Sign in first');},6000);
    timeout.unref();
    ws.on('message',event=>{
      if (typeof event.data!=='string' || event.data.length>65536) return;
      let overdriveRequest=false;
      try {
        const data=JSON.parse(event.data);
        if (!data || typeof data!=='object' || Array.isArray(data)) return;
        overdriveRequest=typeof data.type==='string'&&data.type.startsWith('z2:');
        if (!connected) {
          if (data.type!=='auth') throw fail(401,'Sign in first.');
          const user=authenticate(data.token);
          cutConnection(clients.get(user.id),'Signed in on another device.');
          connected={id:user.id,tokenHash:user.token_hash,socket:ws,transport:socket,room:null,
            compactState:data.compactState===1};
          clients.set(user.id,connected);clearTimeout(timeout);
          send(connected,{type:'ready',user:profile(user)});
          overdrive.attach(connected,true);
          return;
        }
        if (clients.get(connected.id)===connected) socketPacket(connected,data);
      } catch(error) {
        if (ws.readyState===1) {
          ws.send(JSON.stringify({type:overdriveRequest?'z2:error':'error',message:error.status?error.message:'Invalid game message.'}));
        }
        if (!connected) ws.close(1000,'Sign in again');
      }
    });
    ws.on('close',()=>{
      clearTimeout(timeout);
      if (connected&&clients.get(connected.id)===connected) {
        leave(connected,'Your friend disconnected.');clients.delete(connected.id);
        overdrive.disconnect(connected);
      }
    });
  });

  const cleanup=setInterval(()=>{
    const now=sqlTime();
    for (const [k,value] of windowLimits) if (value.until<now) windowLimits.delete(k);
    if (now-lastExpiry>3600000) {st('DELETE FROM sessions WHERE expires<?').run(now);lastExpiry=now;}
  },60000);
  cleanup.unref();
  server.on('close',()=>{
    clearInterval(cleanup);overdrive.close();
    for (const c of clients.values()) cutConnection(c,'Game server stopped.');
    db.close();
  });
  return server;
}

if (process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const database=process.env.RX_DB || 'recoil-x.sqlite';
  if (process.argv[2]==='admin') {
    const db=openDb(database);
    const result=db.prepare('UPDATE users SET admin=1 WHERE handle=? AND banned=0').run(canonical(process.argv[3]));
    console.log(result.changes?'Administrator enabled.':'Create the account in-game before enabling administrator access.');
    db.close();
    if (!result.changes) process.exitCode=1;
  } else {
    const port=Number(process.env.PORT)||8787;
    const origins=(process.env.RX_ORIGINS||'https://recoilxdev.github.io').split(',').map(s=>s.trim()).filter(Boolean);
    const server=createRecoilServer({database,origins});
    server.listen(port,process.env.RX_BIND||process.env.IP||process.env.HOST||'127.0.0.1',()=>console.log('RECOIL X Z.3 listening on port '+port));
  }
}
