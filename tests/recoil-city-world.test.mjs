import assert from 'node:assert/strict';
import test from 'node:test';
import '../server/recoil-city-world.js';

const city = globalThis.RecoilCityWorld;
function advance(state, input, seconds) {
  for (let i = 0; i < Math.round(seconds * 60); i++) city.step(state, input, 1 / 60);
}

test('walk, enter a parked car, steer, brake and exit using the simulation controls', () => {
  const state = city.create();
  assert.equal(state.nearbyVehicle, 'vista');
  assert.equal(state.district, 'Old Quarter');
  assert(city.interact(state));
  const car = state.vehicles.find(v => v.id === state.player.vehicleId);
  const x = car.x;
  advance(state, {forward: 1}, .6);
  assert(car.x > x + 15 && car.speed > 36);
  assert.equal(city.interact(state), false);
  advance(state, {forward: 1, turn: 1}, .2);
  assert(car.angle > .2 && car.y > 151);
  advance(state, {brake: true}, .5);
  assert.equal(car.speed, 0);
  assert(city.interact(state));
  assert.equal(state.player.vehicleId, null);
  assert(Math.hypot(car.x - state.player.x, car.y - state.player.y) >= 17);
  assert.equal(state.nearbyVehicle, car.id);
});

test('a courier can accept, collect and deliver on foot, and payment survives a reload', () => {
  const state = city.create({random: () => .2, career: {cash: 5}});
  assert(city.job(state));
  assert.equal(city.job(state), false);
  advance(state, {walkX: 1}, .37);
  assert(city.job(state));
  assert.equal(state.job.stage, 'dropoff');
  const pay = state.job.pay;
  advance(state, {walkX: -1}, .18);
  advance(state, {walkY: 1}, 5.56);
  advance(state, {walkX: 1}, 4.29);
  assert(city.job(state));
  assert.equal(state.job, null);
  assert.equal(state.district, 'Canal Ward');
  assert.deepEqual(state.career, {cash: 5 + pay, trips: 0, deliveries: 1, bestTime: 10.4, paint: 'Copper Sunset'});
  const loaded = city.create({career: JSON.parse(JSON.stringify(state.career))});
  assert.deepEqual(loaded.career, state.career);
  assert.equal(loaded.offer.kind, 'Passenger');
  // Starting the next job at its pickup never replays the previous payment.
  assert(city.job(state));assert.equal(city.job(state), false);assert.equal(state.career.cash, 5 + pay);
});

test('passengers need a vehicle at both stops and pay once on arrival', () => {
  const state = city.create({random: () => .1, career: {deliveries: 1, cash: 90}});
  assert(city.job(state));assert.equal(state.job.kind, 'Passenger');
  advance(state, {walkX: 1}, .3);
  assert.equal(city.job(state), false);
  assert(city.interact(state));
  assert(city.job(state));assert.equal(state.job.stage, 'dropoff');
  const fare = state.job.pay, car = state.vehicles.find(v => v.id === state.player.vehicleId);
  Object.assign(car, {x: state.job.dropoff.x, y: state.job.dropoff.y, speed: 50});
  advance(state, {brake: true}, 1 / 60);
  assert.equal(city.job(state), false);
  advance(state, {brake: true}, .4);
  assert(city.job(state));
  assert.equal(state.career.trips, 1);
  assert.equal(state.career.cash, 90 + fare);
});

test('streets connect all stops, buildings block walking, and the idle city keeps traffic moving', () => {
  const state = city.create(), p = state.player;
  Object.assign(p, {x: 142, y: 230});
  advance(state, {walkX: 1}, 2);
  assert(p.x >= 165 && p.x <= 168);
  for (const stop of city.map.stops) {
    assert(city.map.roadsX.some(x => Math.abs(x - stop.x) <= city.map.roadWidth / 2) ||
      city.map.roadsY.some(y => Math.abs(y - stop.y) <= city.map.roadWidth / 2));
    assert(!city.map.blocks.some(b => b.kind === 'building' &&
      stop.x >= b.x && stop.x <= b.x + b.w && stop.y >= b.y && stop.y <= b.y + b.h));
  }
  advance(state, {}, 40);
  assert(state.vehicles.filter(v => v.kind === 'traffic' && v.speed > 5).length >= 3);
});

test('an arcade traffic collision attracts a temporary patrol without deducting saved earnings', () => {
  const state = city.create({career: {cash: 125}});
  assert(city.interact(state));
  const car = state.vehicles.find(v => v.id === state.player.vehicleId);
  const traffic = state.vehicles.find(v => v.kind === 'traffic');
  Object.assign(car, {x: 520, y: 825, angle: 0, speed: 100});
  Object.assign(traffic, {x: 550, y: 825, speed: 0, target: 0, route: [{x: 550, y: 825}]});
  advance(state, {forward: 1}, .2);
  assert.equal(state.heat, 1);
  assert(state.vehicles.some(v => v.kind === 'patrol'));
  advance(state, {brake: true}, 16);
  assert.equal(state.heat, 0);
  assert(!state.vehicles.some(v => v.kind === 'patrol'));
  assert.equal(state.career.cash, 125);
});

test('earnings buy a persistent Vista finish only at Sandline Customs', () => {
  const state = city.create({career: {cash: 90, paint: 'unknown'}});
  const car = state.vehicles.find(v => v.id === 'vista');
  assert.equal(state.career.paint, 'Copper Sunset');
  assert.equal(city.respray(state), false);
  assert(city.interact(state));
  Object.assign(car, {x: city.map.garage.x, y: city.map.garage.y, speed: 60});
  city.step(state, {}, 1 / 60);
  assert.equal(city.garageView(state).near, true);
  assert.equal(city.respray(state), false);
  advance(state, {brake: true}, .5);
  assert(city.interact(state));  // Leaving the Vista disables its garage service.
  assert.equal(city.respray(state), false);
  assert(city.interact(state));
  assert.equal(city.garageView(state).nextFinish, 'Harbor Jade');
  assert(city.respray(state));assert.equal(state.career.cash, 45);
  const loaded = city.create({career: JSON.parse(JSON.stringify(state.career))});
  const restored = loaded.vehicles.find(v => v.id === 'vista');
  assert.equal(loaded.career.paint, 'Harbor Jade');assert.equal(restored.color, car.color);
  assert(city.respray(state));assert.equal(state.career.paint, 'Orchid Pearl');
  assert.equal(state.career.cash, 0);
  assert.equal(city.respray(state), false);assert.equal(state.career.paint, 'Orchid Pearl');
  assert.equal(state.career.cash, 0);
});
