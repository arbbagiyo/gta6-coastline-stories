import * as THREE from 'three';
import { WORLD, TUNE } from './config.js';
import { S } from './state.js';
import { clamp, damp, angleDelta, dist2D } from './util.js';
import { createCar, updateCarPhysics } from './vehicles.js';

function spawnHeli() {
const g = new THREE.Group();
const bx = (w, h, d, m, x, y, z) => {
const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
b.position.set(x, y, z);
g.add(b);
};
const dark = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
const white = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
bx(2.6, 1.4, 1.6, white, 0, 0.8, 0);
bx(1.4, 0.9, 1.5, dark, 0, 0.7, -1.2);
bx(0.5, 0.5, 3.4, white, 0, 1, 2.2);
bx(0.5, 0.9, 0.2, dark, 0, 1.3, 3.9);
const rotor = new THREE.Group();
rotor.position.y = 1.7;
for (const [w, d] of [[7, 0.3], [0.3, 7]]) rotor.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), dark));
g.add(rotor);
const cone = new THREE.Mesh(new THREE.ConeGeometry(5, 45, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
cone.position.y = -22.5;
g.add(cone);
const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 20), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.25, depthWrite: false }));
pool.rotation.x = -Math.PI / 2;
pool.position.y = -45.5;
g.add(pool);
const p = S.player.pos;
g.position.set(p.x + 30, 46, p.z + 30);
S.scene.add(g);
S.heli = { group: g, rotor, pos: g.position, angle: 0, hp: 100 };
}

function updateHeli(dt) {
const h = S.heli;
if (!h) return;
h.rotor.rotation.y += dt * 18;
if (S.heliCine) {
const t = S.driving ? S.driving.pos : S.player.pos;
const hd = S.driving ? S.driving.heading : S.player.heading;
const tx = t.x + Math.cos(hd) * S.heliCine.ahead, tz = t.z - Math.sin(hd) * S.heliCine.ahead;
h.pos.x = damp(h.pos.x, tx, 2.5, dt);
h.pos.z = damp(h.pos.z, tz, 2.5, dt);
h.pos.y = damp(h.pos.y, S.heliCine.alt, 2.5, dt);
h.group.rotation.y = hd - Math.PI / 2;
return;
}
const t = S.driving ? S.driving.pos : S.player.pos;
h.angle += dt * 0.25;
const tx = t.x + Math.cos(h.angle) * 8, tz = t.z + Math.sin(h.angle) * 8;
h.pos.x = damp(h.pos.x, tx, 1.2, dt);
h.pos.z = damp(h.pos.z, tz, 1.2, dt);
h.pos.y = damp(h.pos.y, 46, 1.2, dt);
h.group.rotation.y = Math.atan2(-(tz - h.pos.z), tx - h.pos.x) - Math.PI / 2;
}

export function setWanted(level, reason) {
const next = clamp(level, 0, 5);
if (next > S.wanted) {
S.wanted = next;
S.wantedTimer = 0;
S.hiddenTimer = 0;
S.hud?.toast(reason || `Wanted level ${next}! Lose the cops!`);
S.audio?.sirenOn(next > 0);
S.hud?.showStars(next);
} else if (next < S.wanted) {
S.wanted = next;
S.hud?.showStars(next);
if (next === 0) {
S.audio?.sirenOn(false);
S.hud?.toast('You lost them. The heat is off.');
}
}
}

export function spawnPoliceCar(atX, atZ, heading) {
const p = S.player.pos;


const roads = WORLD.roads;
const r = roads[(Math.random() * roads.length) | 0];
const alongX = Math.random() < 0.5;
const dir = Math.random() < 0.5 ? -1 : 1;
const x = atX !== undefined ? atX : (alongX ? p.x + dir * (60 + Math.random() * 40) : r + 3.4);
const z = atZ !== undefined ? atZ : (alongX ? r + 3.4 : p.z + dir * (60 + Math.random() * 40));
const car = createCar('police', clamp(x, -230, 230), clamp(z, -230, 230), heading || 0, 0x1a2530, 'police');
const unit = { car, rammed: false, lostTimer: 0 };
S.police.push(unit);
return unit;
}

function policeSteer(unit, dt) {
const car = unit.car;
const target = S.driving ? S.driving.pos : S.player.pos;
const dx = target.x - car.pos.x, dz = target.z - car.pos.z;
const d = Math.hypot(dx, dz);

const lead = S.driving ? clamp(Math.abs(S.driving.speed) * 0.5, 0, 12) : 0;
const tx = target.x + (S.driving ? Math.cos(S.driving.heading) * lead * Math.sign(S.driving.speed) : 0);
const tz = target.z + (S.driving ? -Math.sin(S.driving.heading) * lead * Math.sign(S.driving.speed) : 0);
const want = Math.atan2(-(tz - car.pos.z), tx - car.pos.x);
const dd = angleDelta(car.heading, want);
car.steer = damp(car.steer, clamp(dd * 2.4, -0.6, 0.6), 5, dt);

const aggression = 0.75 + S.wanted * 0.08;
car.throttle = d > 4 ? aggression : 0.3;
car.brake = d < 3 && Math.abs(car.speed) > 4;
car.handbrake = Math.abs(dd) > 1.4 && Math.abs(car.speed) > 10;
return d;
}

export function updatePolice(dt) {
S.heliCooldown = Math.max(0, S.heliCooldown - dt);
const wantCount = S.wanted === 0 ? 0 : Math.min(TUNE.policeMax, 1 + S.wanted);
while (S.police.length < wantCount) spawnPoliceCar();
while (S.police.length > wantCount) {
const unit = S.police.pop();
S.scene.remove(unit.car.mesh);
}
if (S.wanted >= 3 && !S.heli && S.heliCooldown <= 0) spawnHeli();
if (S.wanted < 3 && S.heli) { S.scene.remove(S.heli.group); S.heli = null; }
if (S.wanted === 0) return;

let anySees = false;
let nearest = 1e9;
for (const unit of S.police) {
const car = unit.car;
const d = policeSteer(unit, dt);
updateCarPhysics(car, dt);
if (!car.dead) nearest = Math.min(nearest, d);

car.sirenPhase += dt * 10;
const on = Math.sin(car.sirenPhase) > 0;
if (car.parts.lightBar) {
car.parts.lightBar.r.color.setHex(on ? 0xff3333 : 0x550000);
car.parts.lightBar.b.color.setHex(on ? 0x000055 : 0x3355ff);
}


const loud = S.playerFiredTimer > 0 || (S.driving && Math.abs(S.driving.speed) > 20);
if (!car.dead && (d < 45 || loud)) anySees = true;

if (d > 220) {
S.scene.remove(car.mesh);
S.police.splice(S.police.indexOf(unit), 1);
spawnPoliceCar();
}
}


if (anySees) {
S.hiddenTimer = 0;
} else {
S.hiddenTimer += dt;
if (S.hiddenTimer > TUNE.wantedDecayHidden) {
setWanted(S.wanted - 1, 'The heat is cooling off…');
S.hiddenTimer = 0;
}
}


const slow = S.driving ? Math.abs(S.driving.speed) < 2 : true;
if (nearest < TUNE.bustRange && slow) {
S.bustTimer += dt;
S.hud?.showBust(S.bustTimer / TUNE.bustTime);
if (S.bustTimer >= TUNE.bustTime) {
S.bustTimer = 0;
S.onBusted?.();
}
} else {
S.bustTimer = Math.max(0, S.bustTimer - dt * 2);
S.hud?.showBust(0);
}


S.audio?.setSiren(nearest < 90 ? clamp(1 - nearest / 90, 0.15, 1) : 0);
updateHeli(dt);
}

export function clearPolice() {
for (const unit of S.police) S.scene.remove(unit.car.mesh);
S.police.length = 0;
if (S.heli) { S.scene.remove(S.heli.group); S.heli = null; }
S.audio?.sirenOn(false);
}
