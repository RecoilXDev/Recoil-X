// Street coordinates increase east and south. Elevation is measured separately.
(() => {
  'use strict';

  const roadsX = Array.from({length:10},(_,i)=>120+240*i);
  const roadsY = Array.from({length:8},(_,i)=>120+240*i);
  const width = 2400, height = 1920, roadWidth = 76;
  const jobRadius = 34, carRadius = 12, footRadius = 5;
  const garage = {name: 'Sandline Customs', x: 298, y: 150, radius: 40};
  const resprayPrice = 45;
  const finishes = [
    {name: 'Copper Sunset', color: '#e97e49'}, {name: 'Harbor Jade', color: '#37bc99'},
    {name: 'Orchid Pearl', color: '#ad8bee'}, {name: 'Signal Gold', color: '#efc65d'},
    {name: 'Midnight Blue', color: '#6186bd'}
  ];
  const districts = [
    {name: 'Old Quarter', x: 0, y: 0, w: 600, h: 480},
    {name: 'Neon Heights', x: 600, y: 0, w: 600, h: 480},
    {name: 'Canal Ward', x: 0, y: 480, w: 600, h: 480},
    {name: 'South Docks', x: 600, y: 480, w: 600, h: 480}
  ];
  for(const [name,x,y,w,h] of [['East Market',1200,0,600,480],['Airport Quarter',1800,0,600,480],['Industrial Park',1200,480,600,480],['East Beach',1800,480,600,480],['Garden Estates',0,960,600,480],['Police Quarter',600,960,600,480],['Sunset Farms',1200,960,600,480],['Marina East',1800,960,600,480],['South Village',0,1440,600,480],['West Coast',600,1440,600,480],['Highway Ward',1200,1440,600,480],['Southern Bay',1800,1440,600,480]])districts.push({name,x,y,w,h});
  const districtAt = (x,y) => districts.find(d=>x>=d.x&&y>=d.y&&x<d.x+d.w&&y<d.y+d.h)?.name||'City outskirts';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function makeBlocks() {
    const blocks = [];
    const xEdges = [0, ...roadsX, width], yEdges = [0, ...roadsY, height];
    for (let row = 0; row < yEdges.length - 1; row++) {
      for (let col = 0; col < xEdges.length - 1; col++) {
        const x = xEdges[col] + (col ? 53 : 10), y = yEdges[row] + (row ? 53 : 10);
        const w = xEdges[col + 1] - (col === roadsX.length ? 10 : 53) - x;
        const h = yEdges[row + 1] - (row === roadsY.length ? 10 : 53) - y;
        const district = districtAt(x + w / 2, y + h / 2);
        if ((col === 2 && row === 2) || (col === 4 && row === 1)) {
          blocks.push({x, y, w, h, district, kind: 'park', name: col === 2 ? 'Canal Gardens' : 'Lantern Park'});
        } else if (w > 120 && h > 120) {
          const split = (w - 24) / 2;
          blocks.push({x, y, w: split, h, kind: 'building', district},
            {x: x + split + 24, y, w: split, h, kind: 'building', district});
        } else {
          blocks.push({x, y, w, h, kind: 'building', district});
        }
      }
    }
    return blocks;
  }
  const stops = [
    ['depot', 'Parcel Depot', 185, 149], ['arcade', 'Orchid Arcade', 570, 285],
    ['cinema', 'Starline Cinema', 892, 150], ['station', 'North Station', 1070, 325],
    ['market', 'Copper Market', 280, 385], ['gardens', 'Canal Gardens', 460, 570],
    ['theater', 'Marina Theater', 880, 630], ['docks', 'Pier Nine', 1000, 810],
    ['works', 'Tideworks', 330, 748], ['wharf', 'West Wharf', 150, 805], ['east','East Market',1320,150],['airport','Airport Quarter',2040,150],['estate','Garden Estates',360,1110],['marina','Marina East',2040,1350],['south','Southern Bay',2280,1830]
  ].map(([id, name, x, y]) => ({id, name, x, y, district: districtAt(x, y)}));
  const shops = [
    {id: 'cafe', name: 'Copper Café', x: 279, y: 399, price: 12},
    {id: 'repair', name: 'Pier Nine Motors', x: 1000, y: 798, price: 30},
    {id:'eastshop',name:'East Market Store',x:1320,y:165,price:12},{id:'southshop',name:'Southern Bay Store',x:2280,y:1845,price:12}
  ];
  const secrets = [
    {id: 'airwave', name: 'The lost airwave', kind: 'radio', x: 240, y: 233},
    {id: 'lantern', name: 'The jade lantern', kind: 'lantern', x: 960, y: 252},
    {id: 'tideclock', name: 'The tide clock', kind: 'clock', x: 720, y: 710}
  ];
  const map = {width, height, roadWidth, roadsX, roadsY, districts, stops, garage, shops, secrets, blocks: makeBlocks()};
  const buildings = map.blocks.filter(block => block.kind === 'building');
  const cellSize=240,buildingCells=new Map();
  for(const b of buildings)for(let i=Math.floor(b.x/cellSize);i<=Math.floor((b.x+b.w)/cellSize);i++)for(let j=Math.floor(b.y/cellSize);j<=Math.floor((b.y+b.h)/cellSize);j++){const k=i+','+j;if(!buildingCells.has(k))buildingCells.set(k,[]);buildingCells.get(k).push(b);}
  function localBuildings(x,y,r){const found=new Set();for(let i=Math.floor((x-r)/cellSize);i<=Math.floor((x+r)/cellSize);i++)for(let j=Math.floor((y-r)/cellSize);j<=Math.floor((y+r)/cellSize);j++)for(const b of buildingCells.get(i+','+j)||[])found.add(b);return found;}
  function clearOfBuildings(x, y, radius) {
    if (x < radius || y < radius || x > width - radius || y > height - radius) return false;
    return ![...localBuildings(x,y,radius)].some(b => {
      const dx = x - clamp(x, b.x, b.x + b.w), dy = y - clamp(y, b.y, b.y + b.h);
      return dx * dx + dy * dy < radius * radius;
    });
  }
  const onRoad = (x, y) => roadsX.some(road => Math.abs(x - road) <= roadWidth / 2)
    || roadsY.some(road => Math.abs(y - road) <= roadWidth / 2);

  const paint = ['#e97e49', '#48aaa7', '#e1bd62', '#959be0', '#e3d4bd', '#dc7774'];
  function parked(id, x, y, angle, color) {
    return {id, kind: 'parked', x, y, angle, color, speed: 0};
  }
  function traffic(id, left, top, right, bottom, segment, offset, speed, color) {
    const a = roadsX[left] + 12, b = roadsY[top] + 12;
    const c = roadsX[right] - 12, d = roadsY[bottom] - 12;
    const route = [{x: a, y: b}, {x: c, y: b}, {x: c, y: d}, {x: a, y: d}];
    const start = route[segment], next = route[(segment + 1) % 4];
    const angle = Math.atan2(next.y - start.y, next.x - start.x);
    return {id, kind: 'traffic', color, angle, speed, cruise: speed, route, target: (segment + 1) % 4,
      x: start.x + (next.x - start.x) * offset, y: start.y + (next.y - start.y) * offset};
  }
  function initialFleet(starterPaint) {
    return [
      parked('vista', 153, 151, 0, finishes.find(f => f.name === starterPaint).color), parked('rio', 395, 272, Math.PI / 2, paint[1]),
      parked('meteor', 795, 395, Math.PI, paint[2]), parked('tide', 1045, 720, -Math.PI / 2, paint[3]),
      parked('cobalt', 285, 805, 0, paint[4]), parked('coral', 635, 525, Math.PI / 2, paint[5]),
      traffic('cab', 0, 0, 2, 2, 0, .41, 50, paint[2]), traffic('mint', 1, 0, 4, 1, 1, .72, 44, paint[1]),
      traffic('rose', 2, 1, 4, 3, 2, .45, 52, paint[5]), traffic('lilac', 0, 1, 2, 3, 3, .36, 46, paint[3]),
      traffic('milk', 1, 2, 3, 3, 0, .54, 39, paint[4]), traffic('ember', 2, 0, 4, 2, 3, .52, 51, paint[0])
    ];
  }
  function readCareer(saved = {}) {
    const clean = key => Number.isFinite(saved?.[key]) ? clamp(saved[key], 0, 1e9) : 0;
    const discoveries = secrets.map(item => item.id).filter(id => Array.isArray(saved?.discoveries) && saved.discoveries.includes(id));
    return {...(discoveries.length ? {discoveries} : {}), cash: Math.floor(clean('cash')), deliveries: Math.floor(clean('deliveries')),
      trips: Math.floor(clean('trips')), bestTime: Math.round(clean('bestTime') * 10) / 10,
      paint: finishes.find(f => f.name === saved?.paint)?.name || finishes[0].name};
  }
  function setNotice(state, message) {
    state.notice = message;
    state.noticeSeconds = 3.5;
  }
  const coats = ['#c06d4d', '#486a82', '#ebbe65', '#577e71', '#b7718c', '#e2d8bd'];
  function placeWalker(p) {
    const horizontal = p.right - p.left, vertical = p.bottom - p.top;
    const d = p.distance;
    if (d < horizontal) {
      p.x = p.left + d; p.y = p.top; p.angle = 0;
    } else if (d < horizontal + vertical) {
      p.x = p.right; p.y = p.top + d - horizontal; p.angle = Math.PI / 2;
    } else if (d < 2 * horizontal + vertical) {
      p.x = p.right - (d - horizontal - vertical); p.y = p.bottom; p.angle = Math.PI;
    } else {
      p.x = p.left; p.y = p.bottom - (d - 2 * horizontal - vertical); p.angle = -Math.PI / 2;
    }
    if (p.speed < 0) p.angle += Math.PI;
    p.phase = Math.sin(p.distance * .25);
  }
  function createPedestrians() {
    const walkers = [];
    const inset = roadWidth / 2 + 7;
    for (let row = 0; row < roadsY.length - 1; row++) {
      for (let col = 0; col < roadsX.length - 1; col++) {
        const left = roadsX[col] + inset, right = roadsX[col + 1] - inset;
        const top = roadsY[row] + inset, bottom = roadsY[row + 1] - inset;
        const length = 2 * (right - left + bottom - top);
        const count = (row + col) % 2 ? 1 : 2;
        for (let i = 0; i < count; i++) {
          const id = walkers.length;
          const walker = {id, hp: 70, mood: 'calm', alarm: 0, downUntil: 0, active: false, left, right, top, bottom, length, color: coats[id % coats.length],
            distance: (id * 83 + i * 137 + 15) % length, speed: (12 + id % 6) * (id % 2 ? -1 : 1)};
          placeWalker(walker);
          walkers.push(walker);
        }
      }
    }
    return walkers;
  }
  const quality = {
    low: {radius: 245, count: 6}, standard: {radius: 410, count: 12}, high: {radius: 610, count: 18}
  };
  function populate(state) {
    const budget = quality[state.quality] || quality.standard;
    const candidates = [];
    for (const p of state.pedestrians) {
      p.active = false;
      if (p.downUntil && state.elapsed >= p.downUntil && distance(p, state.player) > 110) {
        p.hp = 70; p.downUntil = 0; p.alarm = 0; p.mood = 'calm';
      }
      // Distance to the patrol rectangle keeps its source available as a corner comes into view.
      const dx = state.player.x - clamp(state.player.x, p.left, p.right);
      const dy = state.player.y - clamp(state.player.y, p.top, p.bottom);
      if (Math.hypot(dx, dy) <= budget.radius && distance(p, state.player) <= budget.radius + 80) candidates.push(p);
    }
    candidates.sort((a, b) => distance(a, state.player) - distance(b, state.player));
    state.locals = candidates.slice(0, budget.count);
    for (const p of state.locals) p.active = true;
    state.populationAt = state.elapsed + .55;
  }
  function stepPedestrians(state, dt) {
    for (const p of state.locals) {
      if (state.interior||p.hp <= 0 || p.stunUntil>state.elapsed) continue;
      const player = state.player;
      if (p.alarm > 0) {
        p.alarm -= dt;
        if (p.alarm <= 0) p.mood = 'calm';
      }
      if (p.mood === 'defend') {
        p.angle = Math.atan2(player.y - p.y, player.x - p.x);
        const near = distance(p, player);
        if (near < 85 && state.elapsed >= p.counterAt && wallDistance(p.x, p.y, Math.cos(p.angle), Math.sin(p.angle), near) >= near) {
          p.counterAt = state.elapsed + 2.4;
          effect(state, 'return', p, player, 8);
          if (player.vehicleId) damageCar(state, driven(state), 5); else player.hp = Math.max(0, player.hp - 6);
        }
        continue;
      }
      const dx = player.x - p.x, dy = player.y - p.y;
      if (p.mood === 'calm' && player.vehicleId && dx * dx + dy * dy < 24 * 24 &&
          dx * Math.cos(p.angle) + dy * Math.sin(p.angle) > 0) continue;
      p.distance = (p.distance + p.speed * (p.mood === 'flee' ? 3.4 : 1) * dt + p.length) % p.length;
      placeWalker(p);
    }
  }
  function create({career, random = Math.random, weapons = [], equipped = 0, quality: detail = 'standard', rayHit, sound = () => {}} = {}) {
    const saved = readCareer(career);
    const fleet = initialFleet(saved.paint);
    for (const car of fleet) {
      Object.assign(car, {hp: 100, wheel: 0, steer: 0, home: {x: car.x, y: car.y, angle: car.angle, kind: car.kind, target: car.target}});
    }
    const trafficSources = fleet.filter(car => car.kind === 'traffic').map(car => {
      car.routeName = car.id;
      return {...car, home: {...car.home}};
    });
    const state = {map, random, sound, rayHit, trafficSources, nextTrafficCheck: 6, trafficSerial: 0, quality: detail, populationAt: 0, locals: [], effects: [], dangerAt: 0,
      player: {x: 135, y: 169, z: 0, vz: 0, hp: 100, angle: 0, phase: 0, motion: 'idle', vehicleId: null},
      weapons, weapon: clamp(equipped | 0, 0, Math.max(0, weapons.length - 1)),
      ammo: weapons.map(w => ({mag: w.max, stock: w.reserve})), nextShot: 0, reloadAt: 0,
      vehicles: fleet, pedestrians: createPedestrians(), officers: [], stores: shops.map((s,i)=>({...s,keeper:{id:10000+i,x:s.x+6,y:s.y,angle:Math.PI,color:'#af8050',hp:70,phase:0},cooldown:0})), interior:null, deathUntil:0, deathLabel:'', career: saved, elapsed: 0, job: null, offer: null, nearbyVehicle: null,
      district: '', patrolId: 0, heat: 0, heatTime: 0, hitCooldown: 0, notice: '', noticeSeconds: 0};
    populate(state);
    makeOffer(state);
    updateNearby(state);
    return state;
  }
  function makeOffer(state, lastStop) {
    const complete = state.career.deliveries + state.career.trips;
    const kind = complete % 2 ? 'Passenger' : 'Courier';
    // Start the next contract near the player and send them to a different part of town.
    const pickup = lastStop || stops[0];
    const eligible = stops.filter(s => s.district !== pickup.district && distance(s, pickup) > 360);
    const dropoff = complete === 0 ? stops[5] : eligible[clamp(Math.floor(state.random() * eligible.length), 0, eligible.length - 1)];
    state.offer = {kind, pickup, dropoff, pay: Math.round((kind === 'Passenger' ? 45 : 30) + distance(pickup, dropoff) * .12)};
  }
  function updateNearby(state) {
    const player = state.player;
    state.district = districtAt(player.x, player.y);
    let nearest = null, range = 34;
    if (!player.vehicleId) for (const v of state.vehicles) {
      const gap = distance(player, v);
      if (v.hp > 0 && gap <= (v.kind === 'parked' ? range : Math.min(24, range))) { nearest = v.id; range = gap; }
    }
    state.nearbyVehicle = nearest;
  }
  const driven = state => state.vehicles.find(v => v.id === state.player.vehicleId);
  function clearOfCars(state, x, y, radius, ignore) {
    return !state.vehicles.some(v => v !== ignore && Math.hypot(v.x - x, v.y - y) < radius + carRadius);
  }
  function interact(state) {
    const player = state.player, car = driven(state);
    if(state.interior)return false;
    if (car) {
      if (Math.abs(car.speed) > 36) { setNotice(state, 'Slow down to step out.'); return false; }
      for (const offset of [-Math.PI / 2, Math.PI / 2, Math.PI, 0]) {
        const x = car.x + Math.cos(car.angle + offset) * 24, y = car.y + Math.sin(car.angle + offset) * 24;
        if (!clearOfBuildings(x, y, footRadius) || !clearOfCars(state, x, y, footRadius, car)) continue;
        Object.assign(player, {x, y, motion: 'idle', vehicleId: null});
        car.speed = 0;
        updateNearby(state);
        setNotice(state, 'Parked.');
        return true;
      }
      setNotice(state, 'Leave a little space beside your car.');
      return false;
    }
    updateNearby(state);
    const nearest = state.vehicles.find(v => v.id === state.nearbyVehicle);
    if (!nearest || player.z > 3) { setNotice(state, 'Walk up to a vehicle.'); return false; }
    if (nearest.kind !== 'parked') {
      const patrolTaken = nearest.kind === 'patrol';
      nearest.kind = 'parked';
      if (nearest.home) nearest.home.kind = 'parked';
      nearest.speed = 0;
      heatUp(state, patrolTaken ? 'Patrol vehicle reported stolen.' : 'Vehicle reported stolen.');
      alertLocals(state, nearest);
      // The driver leaves on the nearest sidewalk rather than remaining in the vehicle.
      const driver = state.pedestrians.find(p => p.driver === nearest.routeName);
      if (!driver && !patrolTaken && state.pedestrians.filter(p=>p.driver).length<12) {
        const route = state.pedestrians.reduce((best, p) => sidewalkGap(p, nearest) < sidewalkGap(best, nearest) ? p : best);
        const newcomer = {...route, id: state.pedestrians.length, driver: nearest.routeName, hp: 70, downUntil: 0, distance: sidewalkPoint(route, nearest), mood: 'flee', alarm: 6};
        placeWalker(newcomer); state.pedestrians.push(newcomer); populate(state);
      }
    } else setNotice(state, 'You’re behind the wheel.');
    Object.assign(player, {x: nearest.x, y: nearest.y, z: 0, vz: 0, motion: 'driving', angle: nearest.angle, vehicleId: nearest.id});
    state.nearbyVehicle = null;
    return true;
  }
  function garageView(state) {
    const car = driven(state), near = distance(state.player, garage) <= garage.radius;
    const finish = state.career.paint;
    const nextFinish = finishes[(finishes.findIndex(f => f.name === finish) + 1) % finishes.length].name;
    let reason = '';
    if (!near) reason = 'Visit Sandline Customs.';
    else if (car?.id !== 'vista') reason = 'Bring your Vista.';
    else if (Math.abs(car.speed) > 36) reason = 'Slow down to respray.';
    else if (state.career.cash < resprayPrice) reason = 'Earn $45 from city jobs.';
    return {near, eligible: !reason, finish, nextFinish, price: resprayPrice, reason};
  }
  function respray(state) {
    const option = garageView(state);
    if (!option.eligible) { setNotice(state, option.reason); return false; }
    const finish = finishes.find(f => f.name === option.nextFinish);
    state.career.cash -= option.price;
    state.career.paint = finish.name;
    driven(state).color = finish.color;
    setNotice(state, 'Vista resprayed in ' + finish.name + '.');
    return true;
  }
  function job(state) {
    if (!state.job) {
      state.job = {...state.offer, stage: 'pickup', elapsed: 0};
      setNotice(state, 'Head to ' + state.job.pickup.name + '.');
      return true;
    }
    const run = state.job, stop = run.stage === 'pickup' ? run.pickup : run.dropoff;
    if (distance(state.player, stop) > jobRadius) { setNotice(state, 'Meet at ' + stop.name + '.'); return false; }
    const car = driven(state);
    if (run.kind === 'Passenger' && !car) { setNotice(state, 'Bring a car for the passenger.'); return false; }
    if (car && Math.abs(car.speed) > 36) { setNotice(state, 'Slow down at the curb.'); return false; }
    if (run.stage === 'pickup') {
      run.stage = 'dropoff';
      setNotice(state, (run.kind === 'Passenger' ? 'Passenger aboard. ' : 'Parcel collected. ') + 'Next stop: ' + run.dropoff.name + '.');
    } else {
      const career = state.career, time = Math.max(.1, Math.round(run.elapsed * 10) / 10);
      career.cash += run.pay;
      if (run.kind === 'Passenger') career.trips++; else career.deliveries++;
      career.bestTime = career.bestTime ? Math.min(career.bestTime, time) : time;
      setNotice(state, 'Job complete. Earned $' + run.pay + '.');
      state.job = null;
      makeOffer(state, run.dropoff);
    }
    return true;
  }
  function walk(state, input, dt) {
    const p = state.player;
    let dx = clamp(Number(input.walkX) || 0, -1, 1), dy = clamp(Number(input.walkY) || 0, -1, 1);
    if (input.walkX == null && input.walkY == null) {
      p.angle += (Number(input.turn) || 0) * 3 * dt;
      dx = Math.cos(p.angle) * (Number(input.forward) || 0);
      dy = Math.sin(p.angle) * (Number(input.forward) || 0);
    }
    const length = Math.hypot(dx, dy);
    if (p.z > 0 || p.vz) {
      p.vz -= 122 * dt; p.z = Math.max(0, p.z + p.vz * dt);
      if (!p.z) p.vz = 0;
    }
    p.motion = p.z > 0 ? 'jumping' : !length ? 'idle' : input.sprint ? 'sprinting' : 'walking';
    if (!length) return;
    p.angle = Math.atan2(dy, dx);
    const pace = (input.sprint ? 112 : 72) * dt / Math.max(1, length);
    const x = p.x + dx * pace, y = p.y + dy * pace, oldX = p.x, oldY = p.y;
    if (clearOfBuildings(x, p.y, footRadius) && clearOfCars(state, x, p.y, footRadius)) p.x = x;
    if (clearOfBuildings(p.x, y, footRadius) && clearOfCars(state, p.x, y, footRadius)) p.y = y;
    p.phase += Math.hypot(p.x - oldX, p.y - oldY) * .26;
  }
  function jump(state) {
    const p = state.player;
    if (state.interior||state.deathUntil||p.vehicleId || p.z || p.vz) return false;
    p.vz = 48; p.motion = 'jumping'; state.sound('jump'); return true;
  }
  function heatUp(state, reason) {
    state.heat = Math.min(5, state.heat + 1);
    state.heatTime = 14 + 2 * (state.heat - 1);
    const crossings = roadsX.flatMap(x => roadsY.map(y => ({x, y}))).filter(p => distance(p, state.player) >= 245)
      .sort((a, b) => distance(a, state.player) - distance(b, state.player));
    const wanted = Math.ceil(state.heat / 2);
    state.vehicles = state.vehicles.filter(v => !v.unit || driven(state) === v ||
      (v.kind === 'patrol' && v.hp > 0) || distance(v, state.player) < 100);
    let slots = 4 - state.vehicles.filter(v => v.unit).length;
    const patrols = state.vehicles.filter(v => v.kind === 'patrol' && v.hp > 0);
    for (let i = patrols.length; i < wanted && slots > 0; i++, slots--) {
      const point = crossings.find(p => clearOfCars(state, p.x, p.y, carRadius)) || crossings[i];
      state.vehicles.push({...point, id: 'patrol-' + (++state.patrolId), kind: 'patrol', unit: true,
        color: '#38576e', angle: 0, hp: 100, speed: 0, wheel: 0, steer: 0, goal: null, contact: 0});
    }
    setNotice(state, reason);
  }
  function drive(state, car, input, dt) {
    const throttle = clamp(Number(input.forward) || 0, -1, 1), turn = clamp(Number(input.turn) || 0, -1, 1);
    const max = (onRoad(car.x, car.y) ? 166 : 85) * (.6 + .004 * car.hp);
    car.steer += (turn - car.steer) * Math.min(1, dt * 8);
    if (input.brake) car.speed = Math.sign(car.speed) * Math.max(0, Math.abs(car.speed) - 270 * dt);
    else if (throttle) car.speed += throttle * (Math.sign(car.speed) === -Math.sign(throttle) ? 195 : 102) * dt;
    else car.speed = Math.sign(car.speed) * Math.max(0, Math.abs(car.speed) - 40 * dt);
    car.speed = clamp(car.speed, -61, max);
    car.angle += turn * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 25) * (2.45 - .75 * Math.abs(car.speed) / 166) * dt;
    const dx = Math.cos(car.angle) * car.speed * dt, dy = Math.sin(car.angle) * car.speed * dt;
    const x = car.x + dx, y = car.y + dy;
    const other = state.vehicles.find(v => v !== car && Math.hypot(v.x - x, v.y - y) < carRadius * 2
      && (v.x - car.x) * dx + (v.y - car.y) * dy > 0);
    if (!clearOfBuildings(x, y, carRadius) || other) {
      if (other?.kind === 'traffic' && Math.abs(car.speed) > 42 && state.hitCooldown <= 0) {
        heatUp(state, 'Traffic collision reported.');
        state.hitCooldown = 1.6;
      }
      const impact = Math.abs(car.speed);
      car.speed *= -.25;
      if (impact > 32) {
        damageCar(state, car, (impact - 25) * .35);
        if (other) damageCar(state, other, (impact - 25) * .26);
        if (car.hp <= 0) return;
      }
    } else { const oldX=car.x,oldY=car.y;car.x=x;car.y=y;vehicleImpact(state,car,oldX,oldY); }
    Object.assign(state.player, {x: car.x, y: car.y, angle: car.angle});
  }
  function vehicleImpact(state,car,oldX,oldY){
    const speed=Math.abs(car.speed);if(speed<18)return;
    const dx=car.x-oldX,dy=car.y-oldY,l=dx*dx+dy*dy||1;
    for(const npc of [...state.locals,...state.officers]){
      if(npc.hp<=0||npc.stunUntil>state.elapsed)continue;
      const t=clamp(((npc.x-oldX)*dx+(npc.y-oldY)*dy)/l,0,1);
      if(Math.hypot(npc.x-oldX-t*dx,npc.y-oldY-t*dy)>13)continue;
      npc.angle=Math.atan2(dy,dx);npc.stunUntil=state.elapsed+2.5;
      if(speed>=52){npc.hp=0;npc.downUntil=state.elapsed+34;npc.mood='down';}
      if(state.hitCooldown<=0){heatUp(state,'Vehicle impact reported.');state.hitCooldown=1.6;}
    }
  }
  function advanceToward(v, goal, amount) {
    const dx = goal.x - v.x, dy = goal.y - v.y, gap = Math.hypot(dx, dy);
    if (!gap) return true;
    v.angle = Math.atan2(dy, dx);
    const move = Math.min(1, amount / gap);
    v.x += dx * move; v.y += dy * move;
    return move === 1;
  }
  function replenishTraffic(state) {
    state.nextTrafficCheck = state.elapsed + 5;
    for (const source of state.trafficSources) {
      if (state.vehicles.some(c => c.kind === 'traffic' && c.routeName === source.id)) continue;
      // Reuse an abandoned traffic vehicle only after it has left the player's neighborhood.
      const extras = state.vehicles.filter(c => c.kind === 'parked' && c.routeName);
      if (extras.length >= 5) {
        const old = extras.find(c => c.id !== state.player.vehicleId && distance(c,state.player) > 340);
        if (!old) return;
        state.vehicles.splice(state.vehicles.indexOf(old),1);
      }
      const index = source.route.findIndex(p => distance(p,state.player) > 365 && clearOfCars(state,p.x,p.y,carRadius));
      if (index < 0) continue;
      const start = source.route[index], target = (index+1) % source.route.length, next = source.route[target];
      const angle = Math.atan2(next.y-start.y,next.x-start.x);
      const home = {...start,angle,kind:'traffic',target};
      state.vehicles.push({...source,...home,home,id:source.id+'-'+(++state.trafficSerial),speed:source.cruise,hp:100,wheel:0});
    }
  }
  function cityTraffic(state, v, dt) {
    const goal = v.route[v.target], gap = distance(v, goal);
    if (!gap) { v.target = (v.target + 1) % v.route.length; return; }
    const towardX = (goal.x - v.x) / gap, towardY = (goal.y - v.y) / gap;
    const obstructs = (x, y, width) => {
      const dx = x - v.x, dy = y - v.y, ahead = dx * towardX + dy * towardY;
      return ahead > 0 && ahead < 35 && Math.abs(dx * towardY - dy * towardX) < width;
    };
    const yielding = obstructs(state.player.x, state.player.y, state.player.vehicleId ? 21 : 15) ||
      state.vehicles.some(other => {
        if (other === v || !obstructs(other.x, other.y, 19)) return false;
        // Parallel traffic queues. Crossing routes use stable priority to avoid a mutual stop.
        return other.kind !== 'traffic' || Math.cos(v.angle - other.angle) > .8 || v.id > other.id;
      });
    v.speed = yielding ? 0 : Math.min(v.cruise, v.speed + dt * 45);
    if (advanceToward(v, goal, v.speed * dt)) v.target = (v.target + 1) % v.route.length;
  }
  function patrol(state, car, dt) {
    const target = state.player;
    if(car.dismounted)return;
    if(!target.vehicleId&&distance(car,target)<70&&state.officers.length<(state.quality==='low'?2:4)){
      for(const a of [car.angle+Math.PI/2,car.angle-Math.PI/2,car.angle+Math.PI]){const x=car.x+Math.cos(a)*19,y=car.y+Math.sin(a)*19;if(!clearOfBuildings(x,y,footRadius))continue;car.dismounted=true;car.speed=0;state.officers.push({id:20000+state.patrolId+state.officers.length,x,y,angle:a,hp:100,color:'#38576e',phase:0,mood:'defend',nextShot:state.elapsed+1,unit:car.id});return;}
    }
    if (!car.goal || distance(car, car.goal) < 1) {
      const nearest = (lines, pos) => lines.reduce((best, v) => Math.abs(v - pos) < Math.abs(best - pos) ? v : best);
      const ix = roadsX.indexOf(nearest(roadsX, car.x)), iy = roadsY.indexOf(nearest(roadsY, car.y));
      const choices = [[ix - 1, iy], [ix + 1, iy], [ix, iy - 1], [ix, iy + 1]]
        .filter(([x, y]) => x >= 0 && y >= 0 && x < roadsX.length && y < roadsY.length)
        .map(([x, y]) => ({x: roadsX[x], y: roadsY[y]}));
      const near = Math.abs(target.x - car.x) <= roadWidth / 2 || Math.abs(target.y - car.y) <= roadWidth / 2;
      if (near && onRoad(target.x, target.y) && distance(car, target) < 215) {
        // Stay on the current road, including when a driver takes an alley.
        car.goal = Math.abs(target.x - car.x) < Math.abs(target.y - car.y) ?
          {x: car.x, y: target.y} : {x: target.x, y: car.y};
      } else {
        // Return to the grid before choosing the next intersection.
        const intersection = {x: roadsX[ix], y: roadsY[iy]};
        car.goal = distance(car, intersection) > 1 ? intersection : choices.reduce((a, b) => distance(a, target) < distance(b, target) ? a : b);
      }
    }
    car.speed = 70 + 14 * state.heat;
    advanceToward(car, car.goal, car.speed * dt);
    car.contact = distance(car, target) < 26 ? car.contact + dt : 0;
    if(car.contact>1.8&&target.vehicleId){const v=driven(state);if(v)v.speed*=.8;car.contact=0;}
  }
  function stepOfficers(state,dt){
    const p=state.player;
    for(const o of state.officers){if(o.hp<=0||o.stunUntil>state.elapsed||!state.heat||state.interior)continue;
      const dx=p.x-o.x,dy=p.y-o.y,gap=Math.hypot(dx,dy)||1;
      o.angle=Math.atan2(dy,dx);
      if(gap>38){const x=o.x+dx/gap*42*dt,y=o.y+dy/gap*42*dt;if(clearOfBuildings(x,o.y,footRadius))o.x=x;if(clearOfBuildings(o.x,y,footRadius))o.y=y;o.phase=Math.sin(state.elapsed*8);}
      if(gap<105&&state.elapsed>=o.nextShot&&wallDistance(o.x,o.y,dx/gap,dy/gap,gap)>=gap){o.nextShot=state.elapsed+1.5;const head=state.random()<.16;effect(state,'return',{x:o.x,y:o.y,z:9}, {x:p.x,y:p.y,z:head?12:8},8);if(p.vehicleId)damageCar(state,driven(state),8);else{p.hp=Math.max(0,p.hp-(head?100:12));if(!p.hp){state.deathUntil=state.elapsed+2.4;state.deathLabel='DEAD';}}}
    }
  }
  function step(state, input = {}, seconds = 0) {
    let remaining = clamp(Number(seconds) || 0, 0, .25);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 60);
      remaining -= dt;
      state.elapsed += dt;
      if(state.deathUntil){if(state.elapsed>=state.deathUntil){state.deathUntil=0;state.deathLabel='';recover(state);}continue;}
      if (state.elapsed >= state.populationAt) populate(state);
      if (state.elapsed >= state.nextTrafficCheck) replenishTraffic(state);
      stepPedestrians(state, dt);
      if (state.reloadAt && state.elapsed >= state.reloadAt) finishReload(state);
      if (input.fire) fire(state, input.aim);
      if (state.player.hp <= 0) {state.deathUntil=state.elapsed+2.4;state.deathLabel='DEAD';continue;}
      while (state.effects.length && state.effects[0].until <= state.elapsed) state.effects.shift();
      state.noticeSeconds = Math.max(0, state.noticeSeconds - dt);
      if (!state.noticeSeconds) state.notice = '';
      state.hitCooldown = Math.max(0, state.hitCooldown - dt);
      if (state.job) state.job.elapsed += dt;
      const vehicle = driven(state);
      if(state.interior)walkInterior(state,input,dt);else if (vehicle) drive(state, vehicle, input, dt); else walk(state, input, dt);
      stepOfficers(state,dt);
      for (const car of state.vehicles) {
        if (car.hp <= 0) {
          if (car.home && car.restoreAt <= state.elapsed && distance(car, state.player) > 80 && distance(car.home, state.player) > 65 && clearOfCars(state, car.home.x, car.home.y, carRadius, car)) {
            Object.assign(car, car.home, {hp: 100, speed: 0, steer: 0, wheel: 0});
          }
          continue;
        }
        car.wheel = (car.wheel + car.speed * dt * .52) % (Math.PI * 2);
        if (car.kind === 'traffic') cityTraffic(state, car, dt);
        if (car.kind === 'patrol' && state.heat) patrol(state, car, dt);
      }
      if (state.heat) {
        if(!state.interior)state.heatTime -= dt;
        if (state.heatTime <= 0) { state.heat--; state.heatTime = 9; }
      }
      if (!state.heat){state.officers.length=0;if(state.vehicles.some(v=>v.kind==='patrol'))state.vehicles=state.vehicles.filter(v=>v.kind!=='patrol');}
    }
    discover(state);
    updateNearby(state);
    return state;
  }
  function sidewalkPoint(p, point) {
    const w = p.right - p.left, h = p.bottom - p.top;
    const x = clamp(point.x, p.left, p.right), y = clamp(point.y, p.top, p.bottom);
    const options = [[x,p.top,x-p.left], [p.right,y,w+y-p.top],
      [x,p.bottom,w+h+p.right-x], [p.left,y,2*w+h+p.bottom-y]];
    return options.reduce((a,b) => Math.hypot(a[0]-point.x,a[1]-point.y) <= Math.hypot(b[0]-point.x,b[1]-point.y) ? a : b)[2] % p.length;
  }
  function sidewalkGap(p, point) {
    const probe = {...p, distance: sidewalkPoint(p, point)}; placeWalker(probe); return distance(probe, point);
  }
  function alertLocals(state, source) {
    for (const p of state.locals) {
      if (p.hp <= 0 || distance(source, p) > 135) continue;
      if (p.alarm <= 0) {
        const toward = (source.x-p.x)*Math.cos(p.angle) + (source.y-p.y)*Math.sin(p.angle);
        if (toward > 0) p.speed *= -1;
        p.mood = p.id % 7 === 4 && distance(source,p) < 76 ? 'defend' : 'flee';
        p.counterAt = state.elapsed + 1.2;
      }
      p.alarm = 5.5;
    }
  }
  function discover(state) {
    for (const spot of secrets) {
      if (state.career.discoveries?.includes(spot.id) || distance(state.player, spot) > 14) continue;
      (state.career.discoveries ||= []).push(spot.id);
      setNotice(state, 'Discovered ' + spot.name + ' · ' + state.career.discoveries.length + '/' + secrets.length);
    }
  }
  function nearbyShop(state) { return state.interior||state.stores.find(s=>distance(s,state.player)<=28); }
  function enterShop(state){const p=state.player;if(state.deathUntil||p.vehicleId)return false;if(state.interior){const s=state.interior;state.interior=null;Object.assign(p,{x:s.x,y:s.y,z:0,vz:0});return true;}const s=nearbyShop(state);if(!s||s.id==='repair')return false;if(s.cooldown<=state.elapsed&&s.keeper.hp<=0){s.keeper.hp=70;s.keeper.mood='calm';s.keeper.downUntil=0;}state.interior=s;Object.assign(p,{x:s.x-10,y:s.y,z:0,vz:0,angle:0});return true;}
  function walkInterior(state,input,dt){const p=state.player,s=state.interior,dx=clamp(Number(input.walkX)||0,-1,1),dy=clamp(Number(input.walkY)||0,-1,1),n=Math.max(1,Math.hypot(dx,dy));p.x=clamp(p.x+dx*60*dt/n,s.x-14,s.x+14);p.y=clamp(p.y+dy*60*dt/n,s.y-10,s.y+10);p.motion=dx||dy?'walking':'idle';p.phase+=dt*5;}
  function robShop(state){const s=state.interior;if(!s||state.deathUntil)return false;if(s.cooldown>state.elapsed){setNotice(state,'Register unavailable.');return false;}s.cooldown=state.elapsed+90;state.career.cash=Math.min(1e9,state.career.cash+75);heatUp(state,'Shop alarm · patrol responding.');return true;}
  function shop(state) {
    const store = nearbyShop(state), car = driven(state);
    if (!store) return false;
    const repair = store.id === 'repair';
    if(!repair&&store.keeper.hp<=0){setNotice(state,'Shop temporarily closed.');return false;}
    const reason = repair && (!car || Math.abs(car.speed) > 20) ? 'Park a vehicle here for service.' :
      (repair ? car.hp : state.player.hp) >= 100 ? (repair ? 'Vehicle is in good condition.' : 'You already have full health.') :
      state.career.cash < store.price ? 'Requires $' + store.price + ' in city earnings.' : '';
    if (reason) { setNotice(state, reason); return false; }
    state.career.cash -= store.price;
    if (repair) car.hp = 100; else state.player.hp = 100;
    setNotice(state, repair ? 'Vehicle repaired.' : 'Health restored.'); return true;
  }
  function recover(state) {
    const p = state.player, car = driven(state);
    state.interior=null;state.officers.length=0;
    if (car) car.speed = 0;
    Object.assign(p,{x:135,y:169,z:0,vz:0,hp:100,vehicleId:null,motion:'idle'});
    state.heat = 0; state.reloadAt = 0;
    for (const npc of state.locals) { npc.alarm = 0; npc.mood = 'calm'; }
    setNotice(state,'Back at Parcel Depot.');
  }
  function effect(state, kind, from, to, height) {
    if (state.effects.length >= 32) state.effects.shift();
    state.effects.push({kind, x:from.x, y:from.y, z:from.z ?? height, ex:to.x, ey:to.y, ez:to.z ?? height, until:state.elapsed+.16});
  }
  function damageCar(state, car, amount) {
    if (!car || car.hp <= 0) return;
    car.hp = Math.max(0, car.hp - amount);
    if (car.hp) return;
    car.speed = 0; car.destroyedAt = state.elapsed; car.restoreAt = state.elapsed + 40;
    if (car.id === state.player.vehicleId) {
      // The normal exit checks walls and vehicles. The depot is a fallback for a trapped wreck.
      if (!interact(state)) recover(state);
      state.player.hp = Math.max(15, state.player.hp - 18);
    }
    setNotice(state, 'Vehicle wrecked.');
  }
  function buildingHeight(b) {
    const n = Math.abs(b.x*13+b.y*31) % 7;
    return (b.district === 'Neon Heights' ? 49 : b.district === 'South Docks' ? 19 : 23) + n * (b.district === 'Neon Heights' ? 9 : 4);
  }
  // Slab intersection shared by the follow camera, sight checks and weapon contacts.
  function wallDistance(x, y, dx, dy, limit, z = 8, dz = 0, padding = 0) {
    let closest = limit;
    for (const b of localBuildings(x+dx*limit/2,y+dy*limit/2,limit/2+padding+2)) {
      let enter = 0, leave = closest;
      const axes = [[x,dx,b.x-padding,b.x+b.w+padding],[y,dy,b.y-padding,b.y+b.h+padding],[z,dz,-1,buildingHeight(b)+padding]];
      for (const [origin,dir,lo,hi] of axes) {
        if (Math.abs(dir) < 1e-7) { if (origin < lo || origin > hi) { leave = -1; break; } }
        else {
          const a = (lo-origin)/dir, c = (hi-origin)/dir;
          enter = Math.max(enter,Math.min(a,c)); leave = Math.min(leave,Math.max(a,c));
          if (leave < enter) break;
        }
      }
      if (leave >= enter) closest = enter;
    }
    return closest;
  }
  function selectWeapon(state, index) {
    if (!state.weapons.length) return;
    state.weapon = ((index % state.weapons.length) + state.weapons.length) % state.weapons.length;
    state.reloadAt = 0;
  }
  function reload(state) {
    const w = state.weapons[state.weapon], a = state.ammo[state.weapon];
    if (!w || !a.stock || a.mag >= w.max || state.reloadAt) return false;
    state.reloadAt = state.elapsed + w.reload; state.sound('reload'); return true;
  }
  function finishReload(state) {
    const a = state.ammo[state.weapon], take = Math.min(a.stock, state.weapons[state.weapon].max-a.mag);
    a.stock -= take; a.mag += take; state.reloadAt = 0;
  }
  function trace(state, origin, dx, dy, dz, range) {
    let reach = state.interior?Math.min(range,35):wallDistance(origin.x,origin.y,dx,dy,range,origin.z,dz), hit = null;
    if (dz < -.0001) reach = Math.min(reach, -origin.z/dz);
    function test(body, h, r, offset = 0) {
      const t = state.rayHit(origin.x,origin.y,origin.z,dx,dy,dz,
        body.x + Math.cos(body.angle)*offset,body.y + Math.sin(body.angle)*offset,h,r);
      if (t < reach) { reach = t; hit = body; }
    }
    for (const p of (state.interior?[state.interior.keeper]:[...state.locals,...state.officers])) if (p.hp > 0) { test(p,8,3.7); test(p,12,2.5); test(p,3,3); }
    for (const car of (state.interior?[]:state.vehicles)) if (car.hp > 0 && car.id !== state.player.vehicleId) {
      test(car,4,5.7,5.3); test(car,5,6); test(car,4,5.7,-5.3);
    }
    return {x:origin.x+dx*reach,y:origin.y+dy*reach,z:origin.z+dz*reach,hit};
  }
  function fire(state, aim) {
    const p = state.player, w = state.weapons[state.weapon], ammo = state.ammo[state.weapon];
    if (state.deathUntil || !w || !state.rayHit || p.vehicleId || state.reloadAt || state.nextShot > state.elapsed) return false;
    if (!ammo.mag) { reload(state); return false; }
    const yaw = aim?.yaw ?? p.angle, pitch = aim?.pitch || 0, range = w.range * 5;
    p.angle = yaw; p.aimUntil = state.elapsed + .28; ammo.mag--; state.nextShot = state.elapsed + w.cadence;
    const muzzle = {x:p.x + 2*Math.cos(yaw),y:p.y + 2*Math.sin(yaw),z:p.z + 9.7};
    const cp = Math.cos(pitch);
    const target = trace(state,aim?.origin || muzzle,Math.cos(yaw)*cp,Math.sin(yaw)*cp,Math.sin(pitch),range);
    const direction = Math.atan2(target.y-muzzle.y,target.x-muzzle.x);
    const elevation = Math.atan2(target.z-muzzle.z,Math.hypot(target.x-muzzle.x,target.y-muzzle.y));
    let hit = false;
    for (let i = 0; i < w.pellets; i++) {
      const a = direction + (state.random()-.5)*w.spread, b = elevation + (state.random()-.5)*w.spread;
      const c = Math.cos(b);
      const end = trace(state,muzzle,Math.cos(a)*c,Math.sin(a)*c,Math.sin(b),range);
      if (end.hit) {
        hit = true;
        if (end.hit.kind) damageCar(state,end.hit,w.damage);
        else {
          end.hit.hp = Math.max(0,end.hit.hp-w.damage);
          if (!end.hit.hp) { end.hit.downUntil = state.elapsed+34; end.hit.mood = 'down';if(state.interior)state.interior.cooldown=Math.max(state.interior.cooldown,state.elapsed+90); }
        }
      }
      if (i < 3) effect(state,'shot',muzzle,end,9);
    }
    if (!ammo.mag) reload(state);
    state.sound(w.id === 'shot' ? 'shotgun' : w.id === 'sniper' ? 'sniper' : 'gun');
    if (hit) { state.hitAt = state.elapsed; state.sound('hit'); }
    alertLocals(state,p);
    if (state.elapsed >= state.dangerAt) {
      heatUp(state,hit ? 'Hit reported. Patrol responding.' : 'Gunfire reported.'); state.dangerAt = state.elapsed+1.45;
    }
    return true;
  }
  globalThis.RecoilCityWorld = Object.freeze({map, jobRadius, create, step, interact, job, garageView, respray, nearbyShop, shop, enterShop, robShop, jump, reload, selectWeapon, buildingHeight, wallDistance});
})();
