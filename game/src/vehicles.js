import * as THREE from 'three';
import { WORLD, PALETTE, TUNE } from './config.js';
import { S } from './state.js';
import { makeRng, clamp, damp, angleDelta, circleVsBox, dist2D, roadWave } from './util.js';
import { makeTaxiTexture } from './textures.js';

const CAR_TYPES = {
sedan: { len: 4.4, wid: 1.9, h: 1.35, top: 36, accel: 15, grip: 2.4 },
coupe: { len: 4.0, wid: 1.8, h: 1.05, top: 46, accel: 22, grip: 2.9 },
hatch: { len: 3.8, wid: 1.8, h: 1.45, top: 33, accel: 14, grip: 2.5 },
pickup: { len: 5.0, wid: 2.0, h: 1.6, top: 32, accel: 13, grip: 2.2 },
van: { len: 4.9, wid: 2.0, h: 2.0, top: 29, accel: 11, grip: 2.0 },
truck: { len: 6.2, wid: 2.2, h: 2.6, top: 27, accel: 9, grip: 1.8 },
taxi: { len: 4.4, wid: 1.9, h: 1.35, top: 36, accel: 15, grip: 2.4 },
police: { len: 4.5, wid: 1.95, h: 1.35, top: 44, accel: 20, grip: 3.0 },
boat: { len: 6.0, wid: 2.4, h: 1.2, top: 48, accel: 24, grip: 2.6 },
};

const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
const glassMat = new THREE.MeshPhongMaterial({ color: 0x1a2836, shininess: 120 });
const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c1c20 });
const tireMat = new THREE.MeshLambertMaterial({ color: 0x141416 });
const chromeMat = new THREE.MeshPhongMaterial({ color: 0xd8dce0, shininess: 90 });

function box(parent, w, h, d, x, y, z, mat, shadow = true) {
const m = new THREE.Mesh(bodyGeo, mat);
m.scale.set(w, h, d);
m.position.set(x, y, z);
m.castShadow = shadow;
parent.add(m);
return m;
}

export function buildCarMesh(type, color) {
const t = CAR_TYPES[type];
const g = new THREE.Group();
const paint = new THREE.MeshPhongMaterial({ color, shininess: 60 });
const L = t.len, W = t.wid;
const headMat = new THREE.MeshBasicMaterial({ color: 0xfff8d8 });
const tailMat = new THREE.MeshBasicMaterial({ color: 0x881111 });
if (type === 'boat') {
box(g, L, 0.9, W, 0, 0.6, 0, paint);
const bow = new THREE.Mesh(new THREE.ConeGeometry(W / 2, 1.6, 4), paint);
bow.rotation.set(0, Math.PI / 4, -Math.PI / 2);
bow.position.set(L / 2 + 0.7, 0.6, 0);
g.add(bow);
box(g, 1.6, 0.7, W - 0.5, 0.3, 1.35, 0, glassMat);
box(g, 0.9, 0.6, 0.9, -0.6, 1.3, 0, darkMat);
box(g, 0.5, 0.9, 0.4, -L / 2 - 0.2, 0.7, 0, darkMat);
return { group: g, wheels: [], headMat, tailMat, lightBar: null, spec: t };
}
if (type === 'truck') {
box(g, 2.0, 2.2, W, L / 2 - 1.1, 1.5, 0, paint);
box(g, 1.4, 1.0, W - 0.3, L / 2 - 1.0, 2.9, 0, glassMat);
box(g, L - 2.4, 2.4, W, -1.2, 1.6, 0, new THREE.MeshLambertMaterial({ color: 0xd8d4c8 }));
} else if (type === 'van') {
box(g, L, 1.9, W, 0, 1.25, 0, paint);
box(g, 1.3, 0.9, W - 0.2, L / 2 - 0.8, 1.9, 0, glassMat);
} else if (type === 'coupe') {
box(g, L, 0.5, W, 0, 0.5, 0, paint);
box(g, L * 0.42, 0.42, W - 0.4, -L * 0.06, 0.95, 0, glassMat);
box(g, 0.3, 0.12, W - 0.2, -L / 2 + 0.2, 0.85, 0, darkMat);
box(g, L + 0.15, 0.2, W + 0.06, 0, 0.28, 0, darkMat);
} else if (type === 'hatch') {
box(g, L, 0.6, W, 0, 0.6, 0, paint);
box(g, L * 0.55, 0.62, W - 0.25, -L * 0.06, 1.18, 0, paint);
box(g, L * 0.5, 0.55, W - 0.2, -L * 0.06, 1.2, 0, glassMat);
box(g, L + 0.15, 0.22, W + 0.06, 0, 0.34, 0, darkMat);
} else if (type === 'pickup') {
box(g, L, 0.62, W, 0, 0.68, 0, paint);
box(g, L * 0.32, 0.62, W - 0.25, L * 0.2, 1.28, 0, paint);
box(g, L * 0.28, 0.52, W - 0.2, L * 0.2, 1.3, 0, glassMat);
box(g, L * 0.42, 0.34, W - 0.15, -L * 0.26, 1.1, 0, darkMat);
box(g, L + 0.15, 0.22, W + 0.06, 0, 0.38, 0, darkMat);
} else {
box(g, L, 0.62, W, 0, 0.62, 0, paint);
box(g, L * 0.52, 0.55, W - 0.3, L * 0.04, 1.18, 0, paint);
box(g, L * 0.46, 0.5, W - 0.24, L * 0.04, 1.2, 0, glassMat);
box(g, L + 0.15, 0.22, W + 0.06, 0, 0.34, 0, darkMat);
}

for (const s of [-1, 1]) {
box(g, 0.12, 0.22, 0.42, L / 2 + 0.03, 0.72, s * (W / 2 - 0.3), headMat, false);
box(g, 0.12, 0.2, 0.42, -L / 2 - 0.03, 0.72, s * (W / 2 - 0.3), tailMat, false);
}
const wheels = [];
const ws = type === 'pickup' ? 1.2 : type === 'coupe' ? 0.9 : type === 'truck' ? 1.15 : 1;
for (const [wx, wz] of [[-L / 2 + 0.85, -W / 2], [-L / 2 + 0.85, W / 2], [L / 2 - 0.85, -W / 2], [L / 2 - 0.85, W / 2]]) {
const pivot = new THREE.Group();
pivot.position.set(wx, 0.38 * ws, wz);
pivot.scale.set(ws, ws, ws);
const wheel = new THREE.Mesh(wheelGeo, tireMat);
wheel.rotation.x = Math.PI / 2;
wheel.castShadow = true;
const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 8), chromeMat);
hub.rotation.x = Math.PI / 2;
pivot.add(wheel, hub);
g.add(pivot);
wheels.push({ pivot, wheel, front: wx > 0 });
}
let lightBar = null;
if (type === 'police') {
const bar = new THREE.Group();
const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.7), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
r.position.z = -0.4;
const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.7), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
b.position.z = 0.4;
bar.add(r, b);
bar.position.set(-0.1, 1.62, 0);
g.add(bar);
lightBar = { r: r.material, b: b.material };
}
if (type === 'taxi') {
const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.4),
new THREE.MeshBasicMaterial({ map: makeTaxiTexture() }));
sign.position.set(-0.1, 1.58, 0);
g.add(sign);
}
return { group: g, wheels, headMat, tailMat, lightBar, spec: t };
}

let carId = 0;

export function createCar(type, x, z, heading, color, driver) {
const parts = buildCarMesh(type, color);
parts.group.position.set(x, 0, z);
parts.group.rotation.y = heading;
S.scene.add(parts.group);
const car = {
id: carId++,
type,
mesh: parts.group,
parts,
pos: parts.group.position,
heading,
speed: 0,
steer: 0,
wheelSpin: 0,
health: 100,
driver,
throttle: 0,
brake: false,
handbrake: false,
route: null,
topMul: driver === 'traffic' || driver === 'parked' ? 0.92 + Math.random() * 0.16 : 1,
cruise: CAR_TYPES[type].top * (0.32 + Math.random() * 0.12),
bobPhase: 0,
dead: false,
smokeTimer: 0,
sirenPhase: Math.random() * 6.28,
color,
};
return car;
}

function onRoad(x, z) {
for (const r of WORLD.roads) {
if (Math.abs(x - (r + roadWave(z))) < WORLD.roadWidth / 2 + 1 || Math.abs(z - (r + roadWave(x))) < WORLD.roadWidth / 2 + 1) return true;
}
return false;
}

function collideWorld(car) {
const t = car.parts.spec;
const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
for (const off of [-t.len * 0.28, t.len * 0.28]) {
const cx = car.pos.x + fx * off, cz = car.pos.z + fz * off;
for (const b of S.colliders) {
const hit = circleVsBox(cx, cz, 1.55, b);
if (hit) {
const pushX = hit.x - cx, pushZ = hit.z - cz;
car.pos.x += pushX;
car.pos.z += pushZ;
const impact = Math.abs(car.speed);
if (impact > 4) {
if (car.driver !== 'mission') car.health -= (impact - 4) * 0.9;
S.shake = Math.min(0.5, S.shake + impact * 0.012);
if (car.driver === 'player') S.audio?.thud(impact);
S.effects?.burst(car.pos.x, 1, car.pos.z, 0xffcc66, 6, 3);
}

const vn = car.speed * (fx * hit.nx + fz * hit.nz);
if (vn < 0) car.speed -= vn * 1.4;
car.speed *= 0.82;
return;
}
}
}

car.pos.x = clamp(car.pos.x, -223, 238);
car.pos.z = clamp(car.pos.z, -238, 238);
if (car.pos.x <= -223 && car.speed > 0 && Math.cos(car.heading) < 0) car.speed *= 0.6;
}

function trafficSteer(car, dt) {
if (!car.route) pickRoute(car);
let r = car.route;
const alongNow = r.axis === 'x' ? car.pos.x : car.pos.z;
if ((r.end - alongNow) * r.dir <= 0) { pickRoute(car); r = car.route; }
const sAhead = (r.axis === 'x' ? car.pos.x : car.pos.z) + r.dir * 10;
const lat = r.road + roadWave(sAhead) + r.side;
const tx = r.axis === 'x' ? sAhead : lat;
const tz = r.axis === 'x' ? lat : sAhead;
const dx = tx - car.pos.x, dz = tz - car.pos.z;
const want = Math.atan2(-dz, dx);
const d = angleDelta(car.heading, want);
car.steer = damp(car.steer, clamp(d * 2.2, -0.55, 0.55), 6, dt);

const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
let blocked = false;
const all = [...S.traffic, ...S.parked, ...(S.driving ? [S.driving] : []), ...S.police.map((p) => p.car)];
for (const o of all) {
if (o === car || o.dead) continue;
const ox = o.pos.x - car.pos.x, oz = o.pos.z - car.pos.z;
const ahead = ox * fx + oz * fz;
const side = Math.abs(-ox * fz + oz * fx);
if (ahead > 0 && ahead < 11 && side < 2.6) { blocked = true; break; }
}
if (!blocked && S.player && !S.driving) {
const ox = S.player.pos.x - car.pos.x, oz = S.player.pos.z - car.pos.z;
const ahead = ox * fx + oz * fz;
const side = Math.abs(-ox * fz + oz * fx);
if (ahead > 0 && ahead < 9 && side < 2.2) blocked = true;
}
const eff = Math.abs(d) > 0.5 ? car.cruise * 0.5 : car.cruise;
car.throttle = blocked ? 0 : car.speed < eff ? 1 : 0;
car.brake = (blocked && car.speed > 0.5) || car.speed > eff + 8;
}

function pickRoute(car) {
const roads = WORLD.roads;
const near = (v) => roads.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
const old = car.route;
let axis, dir;
if (old && Math.random() < 0.65) { axis = old.axis; dir = old.dir; }
else if (!old) {
const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
if (Math.abs(fx) >= Math.abs(fz)) { axis = 'x'; dir = fx >= 0 ? 1 : -1; }
else { axis = 'z'; dir = fz >= 0 ? 1 : -1; }
} else { axis = Math.random() < 0.5 ? 'x' : 'z'; dir = Math.random() < 0.5 ? 1 : -1; }
let road = near(axis === 'x' ? car.pos.z : car.pos.x);
const endFor = (ax, dd) => {
const al = ax === 'x' ? car.pos.x : car.pos.z;
const ordered = dd > 0 ? roads : [...roads].reverse();
for (const r of ordered) if ((r - al) * dd > 4) return r;
return null;
};
let end = endFor(axis, dir);
if (end === null) {
axis = axis === 'x' ? 'z' : 'x';
const al = axis === 'x' ? car.pos.x : car.pos.z;
dir = al > 0 ? -1 : 1;
road = near(axis === 'x' ? car.pos.z : car.pos.x);
end = endFor(axis, dir);
}
if (end === null) { dir = -dir; end = endFor(axis, dir); }
const side = (axis === 'x' ? 3.4 : -3.4) * dir;
car.route = { axis, road, side, dir, end };
}

export function updateCarPhysics(car, dt) {
const t = car.parts.spec;
if (car.dead) {
car.speed = damp(car.speed, 0, 4, dt);
} else {
const offroad = car.type !== 'boat' && !onRoad(car.pos.x, car.pos.z);
const top = (offroad ? t.top * 0.55 : t.top) * car.topMul;
if (car.throttle > 0) car.speed += t.accel * car.throttle * dt;
if (car.brake) car.speed -= (car.speed > 0 ? 26 : 10) * dt;
if (car.handbrake) car.speed = damp(car.speed, 0, 3.2, dt);

car.speed -= car.speed * (offroad ? 0.9 : 0.35) * dt;
car.speed = clamp(car.speed, -10, top);
const steerAuthority = clamp(Math.abs(car.speed) / 8, 0, 1) * (car.handbrake ? 1.7 : 1);
car.heading += car.steer * steerAuthority * t.grip * (car.speed >= 0 ? 1 : -1) * dt * (car.speed / Math.max(6, Math.abs(car.speed)));
}
const fx = Math.cos(car.heading), fz = -Math.sin(car.heading);
const prevX = car.pos.x, prevZ = car.pos.z;
car.pos.x += fx * car.speed * dt;
car.pos.z += fz * car.speed * dt;
if (car.type === 'boat') {
car.pos.x = clamp(car.pos.x, -298, -226);
car.pos.z = clamp(car.pos.z, -238, 238);
car.bobPhase += dt;
car.pos.y = Math.sin(car.bobPhase * 1.4) * 0.12;
if (Math.abs(car.speed) > 8) {
car.smokeTimer -= dt;
if (car.smokeTimer <= 0) {
car.smokeTimer = 0.12;
S.effects?.smoke(car.pos.x - fx * 3, 0.4, car.pos.z - fz * 3, 0xdff2f8);
}
}
} else collideWorld(car);
car.mesh.rotation.y = car.heading;

car.wheelSpin += (car.speed / 0.38) * dt;
for (const w of car.parts.wheels) {
w.wheel.rotation.y = car.wheelSpin;
if (w.front) w.pivot.rotation.y = car.steer * 0.9;
}

car.parts.tailMat.color.setHex(car.brake ? 0xff3333 : 0x881111);

if (car.health < 35 && !car.dead) {
car.smokeTimer -= dt;
if (car.smokeTimer <= 0) {
car.smokeTimer = 0.09;
S.effects?.smoke(car.pos.x + fx * -1.6, 1.2, car.pos.z + fz * -1.6, car.health < 15 ? 0x222222 : 0x999999);
}
}
if (car.health <= 0 && !car.dead) {
car.dead = true;
S.effects?.burst(car.pos.x, 1.2, car.pos.z, 0xff8833, 24, 6);
S.audio?.explosion(dist2D(car.pos.x, car.pos.z, S.player.pos.x, S.player.pos.z));
S.shake = Math.min(0.8, S.shake + 0.4);
}
if (car.driver === 'player') {
S.stats.distanceDriven += Math.hypot(car.pos.x - prevX, car.pos.z - prevZ);
}
return { fx, fz };
}

function carVsCar(dt) {
const cars = [...S.traffic, ...S.parked, ...S.police.map((p) => p.car)];
if (S.driving) cars.push(S.driving);
for (let i = 0; i < cars.length; i += 1) {
for (let j = i + 1; j < cars.length; j += 1) {
const a = cars[i], b = cars[j];
if (a.dead && b.dead) continue;
const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
const d = Math.hypot(dx, dz);
const min = 3.4;
if (d < min && d > 1e-4) {
const nx = dx / d, nz = dz / d, push = (min - d) / 2;
a.pos.x -= nx * push; a.pos.z -= nz * push;
b.pos.x += nx * push; b.pos.z += nz * push;
const rel = Math.abs(a.speed - b.speed);
if (rel > 5) {
a.health -= (rel - 5) * 0.5;
b.health -= (rel - 5) * 0.5;
if (a.driver === 'player' || b.driver === 'player') {
S.shake = Math.min(0.5, S.shake + rel * 0.01);
S.audio?.thud(rel);
S.effects?.burst((a.pos.x + b.pos.x) / 2, 1, (a.pos.z + b.pos.z) / 2, 0xffcc66, 8, 4);
}
}
const avg = (a.speed + b.speed) / 2;
a.speed = damp(a.speed, avg, 6, dt);
b.speed = damp(b.speed, avg, 6, dt);
}
}
}
}

export function createTraffic() {
const rng = makeRng(4242);
const types = ['sedan', 'coupe', 'hatch', 'pickup', 'van', 'taxi', 'sedan', 'truck', 'hatch'];
for (let i = 0; i < TUNE.trafficCount; i += 1) {
const rx = WORLD.roads[(rng() * WORLD.roads.length) | 0];
const rz = WORLD.roads[(rng() * WORLD.roads.length) | 0];
const alongX = rng() < 0.5;
const t = -200 + rng() * 400;
const heading = alongX ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
const side = alongX ? (heading === 0 ? 3.4 : -3.4) : (heading > 0 ? 3.4 : -3.4);
const x = alongX ? t : rx + roadWave(t) + side;
const z = alongX ? rz + roadWave(t) + side : t;
const type = types[(rng() * types.length) | 0];
const color = type === 'taxi' ? 0xf2c230 : PALETTE.carPaints[(rng() * PALETTE.carPaints.length) | 0];
const car = createCar(type, x, z, heading, color, 'traffic');
car.speed = car.cruise;
pickRoute(car);
S.traffic.push(car);
}

for (let i = 0; i < TUNE.parkedCount; i += 1) {
const rx = WORLD.roads[(rng() * WORLD.roads.length) | 0];
const alongX = rng() < 0.5;
const t = -190 + rng() * 380;
const x = alongX ? t : rx + roadWave(t) + (rng() < 0.5 ? -5.6 : 5.6);
const z = alongX ? rx + roadWave(t) + (rng() < 0.5 ? -5.6 : 5.6) : t;
const heading = alongX ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
const type = types[(rng() * types.length) | 0];
const color = type === 'taxi' ? 0xf2c230 : PALETTE.carPaints[(rng() * PALETTE.carPaints.length) | 0];
const car = createCar(type, x, z, heading, color, 'parked');
S.parked.push(car);
S.spawnPoints.push({ x, z, heading, type, color });
}
for (const [bx, bz, bh] of [[-234, -40, 0], [-234, 90, Math.PI]]) {
const boat = createCar('boat', bx, bz, bh, PALETTE.carPaints[(rng() * PALETTE.carPaints.length) | 0], 'parked');
S.parked.push(boat);
}
}

export function updateVehicles(dt) {
for (const car of S.traffic) {
if (car.dead) continue;
trafficSteer(car, dt);
updateCarPhysics(car, dt);

if (S.player && dist2D(car.pos.x, car.pos.z, S.player.pos.x, S.player.pos.z) > 280) {
const rx = WORLD.roads[(Math.random() * WORLD.roads.length) | 0];
const east = Math.random() < 0.5;
car.heading = east ? 0 : Math.PI;
car.pos.x = clamp(S.player.pos.x + (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 60), -230, 230);
car.pos.z = rx + roadWave(car.pos.x) + (east ? 3.4 : -3.4);
pickRoute(car);
}
}
for (const car of S.parked) {
if (!car.dead) updateCarPhysics(car, dt);
}
if (S.driving) updateCarPhysics(S.driving, dt);
carVsCar(dt);
}

export function nearestCar(x, z, maxDist) {
let best = null, bestD = maxDist;
for (const car of [...S.traffic, ...S.parked]) {
if (car.dead) continue;
const d = dist2D(x, z, car.pos.x, car.pos.z);
if (d < bestD) { best = car; bestD = d; }
}
return best;
}

export function respawnParkedCar() {
const spot = S.spawnPoints[(Math.random() * S.spawnPoints.length) | 0];
if (!spot) return;
if (dist2D(spot.x, spot.z, S.player.pos.x, S.player.pos.z) < 40) return;
const car = createCar(spot.type, spot.x, spot.z, spot.heading, spot.color, 'parked');
S.parked.push(car);
}
