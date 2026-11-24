// Local city simulation. Canvas coordinates increase east and south.
(() => {
  'use strict';

  const roadsX = [120, 360, 600, 840, 1080];
  const roadsY = [120, 360, 600, 840];
  const width = 1200, height = 960, roadWidth = 76;
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
  const districtAt = (x, y) => districts[Number(x >= 600) + 2 * Number(y >= 480)].name;
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
    ['works', 'Tideworks', 330, 748], ['wharf', 'West Wharf', 150, 805]
  ].map(([id, name, x, y]) => ({id, name, x, y, district: districtAt(x, y)}));
  const map = {width, height, roadWidth, roadsX, roadsY, districts, stops, garage, blocks: makeBlocks()};
  const buildings = map.blocks.filter(block => block.kind === 'building');
  function clearOfBuildings(x, y, radius) {
    if (x < radius || y < radius || x > width - radius || y > height - radius) return false;
    return !buildings.some(b => {
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
    return {cash: Math.floor(clean('cash')), deliveries: Math.floor(clean('deliveries')),
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
          const walker = {left, right, top, bottom, length, color: coats[id % coats.length],
            distance: (id * 83 + i * 137 + 15) % length, speed: (12 + id % 6) * (id % 2 ? -1 : 1)};
          placeWalker(walker);
          walkers.push(walker);
        }
      }
    }
    return walkers;
  }
  function stepPedestrians(state, dt) {
    for (const p of state.pedestrians) {
      // Pause on the sidewalk when the player's vehicle crosses directly ahead.
      const player = state.player;
      const dx = player.x - p.x, dy = player.y - p.y;
      if (player.vehicleId && dx * dx + dy * dy < 24 * 24 &&
          dx * Math.cos(p.angle) + dy * Math.sin(p.angle) > 0) continue;
      p.distance = (p.distance + p.speed * dt + p.length) % p.length;
      placeWalker(p);
    }
  }
  function create({career, random = Math.random} = {}) {
    const saved = readCareer(career);
    const state = {map, random, player: {x: 135, y: 169, angle: 0, vehicleId: null}, vehicles: initialFleet(saved.paint), pedestrians: createPedestrians(),
      career: saved, elapsed: 0, job: null, offer: null, nearbyVehicle: null, district: '',
      heat: 0, heatTime: 0, hitCooldown: 0, notice: '', noticeSeconds: 0};
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
      if (v.kind === 'parked' && gap <= range) { nearest = v.id; range = gap; }
    }
    state.nearbyVehicle = nearest;
  }
  const driven = state => state.vehicles.find(v => v.id === state.player.vehicleId);
  function clearOfCars(state, x, y, radius, ignore) {
    return !state.vehicles.some(v => v !== ignore && Math.hypot(v.x - x, v.y - y) < radius + carRadius);
  }
  function interact(state) {
    const player = state.player, car = driven(state);
    if (car) {
      if (Math.abs(car.speed) > 36) { setNotice(state, 'Slow down to step out.'); return false; }
      for (const offset of [-Math.PI / 2, Math.PI / 2, Math.PI, 0]) {
        const x = car.x + Math.cos(car.angle + offset) * 24, y = car.y + Math.sin(car.angle + offset) * 24;
        if (!clearOfBuildings(x, y, footRadius) || !clearOfCars(state, x, y, footRadius, car)) continue;
        Object.assign(player, {x, y, vehicleId: null});
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
    if (!nearest) { setNotice(state, 'Walk up to a parked car.'); return false; }
    Object.assign(player, {x: nearest.x, y: nearest.y, angle: nearest.angle, vehicleId: nearest.id});
    state.nearbyVehicle = null;
    setNotice(state, 'You’re behind the wheel.');
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
    if (!length) return;
    p.angle = Math.atan2(dy, dx);
    const pace = (input.brake ? 90 : 72) * dt / Math.max(1, length);
    const x = p.x + dx * pace, y = p.y + dy * pace;
    if (clearOfBuildings(x, p.y, footRadius) && clearOfCars(state, x, p.y, footRadius)) p.x = x;
    if (clearOfBuildings(p.x, y, footRadius) && clearOfCars(state, p.x, y, footRadius)) p.y = y;
  }
  function heatUp(state) {
    state.heat = Math.min(3, state.heat + 1);
    state.heatTime = 14;
    if (!state.vehicles.some(v => v.kind === 'patrol')) {
      const x = roadsX.reduce((best, v) => Math.abs(state.player.x - v) < Math.abs(state.player.x - best) ? v : best);
      const options = roadsY.filter(v => Math.abs(v - state.player.y) > 220);
      const y = options.reduce((best, v) => Math.abs(state.player.y - v) < Math.abs(state.player.y - best) ? v : best);
      state.vehicles.push({id: 'patrol', kind: 'patrol', color: '#4f79be', x, y, angle: 0, speed: 0, goal: null});
    }
    setNotice(state, 'Traffic collision. City patrol alerted.');
  }
  function drive(state, car, input, dt) {
    const throttle = clamp(Number(input.forward) || 0, -1, 1), turn = clamp(Number(input.turn) || 0, -1, 1);
    const max = onRoad(car.x, car.y) ? 166 : 85;
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
        heatUp(state);
        state.hitCooldown = 1.6;
      }
      car.speed *= -.25;
    } else { car.x = x; car.y = y; }
    Object.assign(state.player, {x: car.x, y: car.y, angle: car.angle});
  }
  function advanceToward(v, goal, amount) {
    const dx = goal.x - v.x, dy = goal.y - v.y, gap = Math.hypot(dx, dy);
    if (!gap) return true;
    v.angle = Math.atan2(dy, dx);
    const move = Math.min(1, amount / gap);
    v.x += dx * move; v.y += dy * move;
    return move === 1;
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
    if (distance(car, target) < 24) {
      state.heat = 0;
      const v = driven(state);
      if (v) v.speed *= .2;
      setNotice(state, 'Patrol check complete. The streets are clear.');
    }
  }
  function step(state, input = {}, seconds = 0) {
    let remaining = clamp(Number(seconds) || 0, 0, .25);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 60);
      remaining -= dt;
      state.elapsed += dt;
      stepPedestrians(state, dt);
      state.noticeSeconds = Math.max(0, state.noticeSeconds - dt);
      if (!state.noticeSeconds) state.notice = '';
      state.hitCooldown = Math.max(0, state.hitCooldown - dt);
      if (state.job) state.job.elapsed += dt;
      const vehicle = driven(state);
      if (vehicle) drive(state, vehicle, input, dt); else walk(state, input, dt);
      for (const car of state.vehicles) {
        if (car.kind === 'traffic') cityTraffic(state, car, dt);
        if (car.kind === 'patrol' && state.heat) patrol(state, car, dt);
      }
      if (state.heat) {
        state.heatTime -= dt;
        if (state.heatTime <= 0) { state.heat--; state.heatTime = 9; }
      }
      if (!state.heat && state.vehicles.at(-1)?.kind === 'patrol') state.vehicles.pop();
    }
    updateNearby(state);
    return state;
  }
  globalThis.RecoilCityWorld = Object.freeze({map, jobRadius, create, step, interact, job, garageView, respray});
})();
