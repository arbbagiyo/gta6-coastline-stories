import * as THREE from 'three';
import { TUNE, PALETTE, WEAPONS } from './config.js';
import { S, addRespect } from './state.js';
import { clamp, damp, dampAngle, angleDelta, circleVsBox, dist2D } from './util.js';
import { buildPersonRig, animateRig, knockPed, angerPed } from './characters.js';
import { nearestCar, respawnParkedCar } from './vehicles.js';
import { input, axis } from './input.js';
import { cameraForward } from './camera.js';

const raycaster = new THREE.Raycaster();

export function createPlayer(x, z, heading) {
const rig = buildPersonRig({ face: 'lena', shirt: 0xf2f2f2, pants: 0x2e5ac8, skin: 0xe8c39a, cap: null });
rig.group.position.set(x, 0.3, z);
S.scene.add(rig.group);
const player = {
rig,
pos: rig.group.position,
heading,
vy: 0,
grounded: true,
moveSpeed: 0,
aiming: false,
fireCooldown: 0,
reloadTimer: 0,
gun: null,
rpgTube: null,
rockets: 6,
rpgCooldown: 0,
punchCooldown: 0,
punchAnim: 0,
};

const gun = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.42), new THREE.MeshLambertMaterial({ color: 0x222226 }));
body.position.z = -0.2;
const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.1), new THREE.MeshLambertMaterial({ color: 0x333333 }));
grip.position.set(0, -0.12, 0.02);
gun.add(body, grip);
gun.position.set(0, -0.66, 0);
rig.armR.add(gun);
gun.visible = false;
player.gun = gun;
const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.9, 8), new THREE.MeshLambertMaterial({ color: 0x3a4a3a }));
tube.rotation.x = Math.PI / 2 - 0.15;
tube.position.set(0, -0.5, -0.3);
rig.armR.add(tube);
tube.visible = false;
player.rpgTube = tube;
S.player = player;
return player;
}

function playerCollide(p) {
for (const b of S.colliders) {
const hit = circleVsBox(p.pos.x, p.pos.z, 0.55, b);
if (hit) { p.pos.x = hit.x; p.pos.z = hit.z; }
}
p.pos.x = clamp(p.pos.x, -300, 238);
p.pos.z = clamp(p.pos.z, -238, 238);
}

function tryEnterCar() {
const car = nearestCar(S.player.pos.x, S.player.pos.z, 4.5);
if (!car) return;
if (S.swimming && car.type !== 'boat') {
S.hud?.toast('Too deep to steal that — swim to shore first!');
return;
}

if (car.driver === 'traffic') {
S.audio?.carDoor();
S.hud?.toast('Car jacked — the driver fled!');
S.wanted = Math.max(S.wanted, 1);
S.stats.carsStolen += 1;
addRespect(2);
car.jacked = true;
S.traffic.splice(S.traffic.indexOf(car), 1);
} else {
S.audio?.carDoor();
S.stats.carsStolen += 1;
car.jacked = false;
S.parked.splice(S.parked.indexOf(car), 1);
setTimeout(respawnParkedCar, 8000);
}
car.driver = 'player';
S.driving = car;
S.player.rig.group.visible = false;
S.audio?.engineOn();
S.hud?.setPrompt('');
}

function exitCar() {
const car = S.driving;
if (!car || Math.abs(car.speed) > 6) {
if (car) S.hud?.toast('Too fast to jump out!');
return;
}
car.speed = 0;
car.driver = 'parked';
S.parked.push(car);
S.driving = null;
const side = car.heading + Math.PI / 2;
S.player.pos.set(car.pos.x + Math.cos(side) * 2.4, 0.3, car.pos.z - Math.sin(side) * 2.4);
S.player.heading = car.heading;
S.player.rig.group.visible = true;
S.audio?.carDoor();
}

function shoot() {
const p = S.player;
if (p.reloadTimer > 0 || p.fireCooldown > 0) return;
const def = WEAPONS[S.weapon];
if (!def) return;
const ammo = S.weapon === 'smg' ? S.smgAmmo : S.ammo;
if (ammo <= 0) {
S.audio?.click();
startReload();
return;
}
p.fireCooldown = def.cd;
if (S.weapon === 'smg') S.smgAmmo -= 1;
else S.ammo -= 1;
S.playerFiredTimer = 2.5;
S.stats.shotsFired += 1;
S.audio?.shot(0, true);
addShake(0.12);
const from = new THREE.Vector3(p.pos.x, p.pos.y + 1.5, p.pos.z);
const dir = new THREE.Vector3();
S.camera.getWorldDirection(dir);
S.effects?.muzzle(from.x, from.y, from.z, p.heading);
S.effects?.tracer(from, dir);
raycaster.set(S.camera.position, dir);
raycaster.far = 90;

let bestRival = null, bestT = 1e9;
for (const r of S.rivals) {
if (r.down) continue;
const to = new THREE.Vector3(r.pos.x, r.pos.y + 1.2, r.pos.z).sub(S.camera.position);
const t = to.dot(dir);
if (t < 1 || t > 90) continue;
const closest = S.camera.position.clone().add(dir.clone().multiplyScalar(t));
const d = closest.distanceTo(new THREE.Vector3(r.pos.x, r.pos.y + 1.2, r.pos.z));
if (d < 1.1 && t < bestT) { bestRival = r; bestT = t; }
}
if (bestRival) {
const killed = damageRivalRef(bestRival, def.dmg, p.pos.x, p.pos.z);
S.stats.shotsHit += 1;
if (killed) {
S.hud?.toast('Rival down.');
S.mission?.onRivalDown?.();
}
return;
}

for (const ped of S.peds) {
if (ped.down) continue;
const to = new THREE.Vector3(ped.pos.x, ped.pos.y + 1.1, ped.pos.z).sub(S.camera.position);
const t = to.dot(dir);
if (t < 1 || t > 90) continue;
const closest = S.camera.position.clone().add(dir.clone().multiplyScalar(t));
if (closest.distanceTo(new THREE.Vector3(ped.pos.x, ped.pos.y + 1.1, ped.pos.z)) < 1.0) {
knockPed(ped, p.pos.x, p.pos.z);
S.wanted = Math.max(S.wanted, 2);
addRespect(-5);
S.hud?.toast('You hit a civilian! The police are coming.');
return;
}
}

const hits = raycaster.intersectObjects(S.scene.children, true);
for (const h of hits) {
let o = h.object, ownRig = false;
while (o) { if (o === p.rig.group) { ownRig = true; break; } o = o.parent; }
if (ownRig) continue;
if (h.distance < 90) {
S.effects?.burst(h.point.x, h.point.y, h.point.z, 0xffdd88, 4, 2);
}
break;
}
}

let damageRivalRef = () => false;
export function setDamageRival(fn) { damageRivalRef = fn; }

function startReload() {
const p = S.player;
const def = WEAPONS[S.weapon];
if (!def || p.reloadTimer > 0) return;
if (S.weapon === 'smg' ? S.smgAmmo === def.mag : S.ammo === def.mag) return;
p.reloadTimer = 1.3;
S.audio?.reload();
}

const rockets = [];
const rocketGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.7, 6);
const rocketMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
const UP = new THREE.Vector3(0, 1, 0);

function fireRpg() {
const p = S.player;
if (p.rpgCooldown > 0 || S.swimming) return;
if (p.rockets <= 0) {
S.audio?.click();
S.hud?.toast('No rockets left — finish a mission to resupply.');
p.rpgCooldown = 0.5;
return;
}
p.rpgCooldown = 1.2;
p.rockets -= 1;
S.playerFiredTimer = 2.5;
S.stats.shotsFired += 1;
S.audio?.shot(0, true);
addShake(0.25);
const dir = new THREE.Vector3();
S.camera.getWorldDirection(dir);
const from = new THREE.Vector3(p.pos.x, p.pos.y + 1.4, p.pos.z).addScaledVector(dir, 1.2);
const mesh = new THREE.Mesh(rocketGeo, rocketMat);
mesh.position.copy(from);
mesh.quaternion.setFromUnitVectors(UP, dir);
S.scene.add(mesh);
let homing = false;
if (S.heli) {
const toH = new THREE.Vector3().subVectors(S.heli.group.position, p.pos);
toH.y = 0;
const flat = dir.clone();
flat.y = 0;
homing = toH.lengthSq() > 0.01 && flat.lengthSq() > 0.01 && toH.normalize().dot(flat.normalize()) > 0.7;
}
rockets.push({ mesh, vel: dir.multiplyScalar(30), life: 3.5, trail: 0, homing });
}

function updateRockets(dt) {
for (let i = rockets.length - 1; i >= 0; i -= 1) {
const r = rockets[i];
r.life -= dt;
if (r.homing && S.heli) {
const toH = new THREE.Vector3().subVectors(S.heli.group.position, r.mesh.position);
const dH = toH.length();
if (dH > 4 && dH < 80) {
const want = toH.normalize().multiplyScalar(30);
r.vel.lerp(want, clamp(2.5 * dt, 0, 1)).setLength(30);
r.mesh.quaternion.setFromUnitVectors(UP, r.vel.clone().normalize());
}
}
r.mesh.position.addScaledVector(r.vel, dt);
r.trail -= dt;
if (r.trail <= 0) {
r.trail = 0.03;
S.effects?.smoke(r.mesh.position.x, r.mesh.position.y, r.mesh.position.z, 0xcccccc);
}
const pos = r.mesh.position;
let hit = pos.y <= 0.15 || r.life <= 0;
if (!hit && S.heli && pos.distanceTo(S.heli.group.position) < 5) hit = true;
if (!hit) for (const b of S.colliders) {
const h = circleVsBox(pos.x, pos.z, 0.3, b);
if (h) { hit = true; break; }
}
if (!hit) for (const pc of S.police) {
if (!pc.car.dead && dist2D(pos.x, pos.z, pc.car.pos.x, pc.car.pos.z) < 2.4 && pos.y < 3) { hit = true; break; }
}
if (!hit) for (const rv of S.rivals) {
if (!rv.down && dist2D(pos.x, pos.z, rv.pos.x, rv.pos.z) < 1.3 && pos.y < 2.2) { hit = true; break; }
}
if (hit) {
explodeRocket(pos);
S.scene.remove(r.mesh);
rockets.splice(i, 1);
}
}
}

function explodeRocket(pos) {
S.effects?.burst(pos.x, pos.y, pos.z, 0xff8833, 34, 9);
S.effects?.smoke(pos.x, pos.y, pos.z, 0x333333);
S.audio?.explosion(dist2D(pos.x, pos.z, S.player.pos.x, S.player.pos.z));
addShake(0.5);
S.playerFiredTimer = 2.5;
for (const pc of S.police) {
if (!pc.car.dead && dist2D(pos.x, pos.z, pc.car.pos.x, pc.car.pos.z) < 7) pc.car.health -= 120;
}
for (const rv of S.rivals) {
if (!rv.down && dist2D(pos.x, pos.z, rv.pos.x, rv.pos.z) < 7) {
const killed = damageRivalRef(rv, 120, pos.x, pos.z);
if (killed) S.mission?.onRivalDown?.();
}
}
if (S.heli && pos.distanceTo(S.heli.group.position) < 9) {
S.heli.hp -= 70;
if (S.heli.hp <= 0) {
S.effects?.burst(S.heli.group.position.x, S.heli.group.position.y, S.heli.group.position.z, 0xff5533, 40, 10);
S.scene.remove(S.heli.group);
S.heli = null;
S.heliCooldown = 25;
S.hud?.toast('Helicopter down!');
}
}
for (const ped of S.peds) {
if (!ped.down && dist2D(pos.x, pos.z, ped.pos.x, ped.pos.z) < 7) {
knockPed(ped, pos.x, pos.z);
S.wanted = Math.max(S.wanted, 2);
}
}
if (!S.driving && dist2D(pos.x, pos.z, S.player.pos.x, S.player.pos.z) < 4) damagePlayer(25, pos.x, pos.z);
}

function punch() {
const p = S.player;
const fx = Math.cos(p.heading), fz = -Math.sin(p.heading);
p.punchAnim = 0.25;
S.audio?.thud(3);
S.playerFiredTimer = 1.5;
for (const r of S.rivals) {
if (r.down) continue;
const dx = r.pos.x - p.pos.x, dz = r.pos.z - p.pos.z;
if (Math.hypot(dx, dz) < 2.3 && dx * fx + dz * fz > 0.5) {
const killed = damageRivalRef(r, 12, p.pos.x, p.pos.z);
if (killed) {
S.hud?.toast('Rival down.');
S.mission?.onRivalDown?.();
}
return;
}
}
let best = null, bestD = 2.3;
for (const ped of S.peds) {
if (ped.down) continue;
const dx = ped.pos.x - p.pos.x, dz = ped.pos.z - p.pos.z;
const d = Math.hypot(dx, dz);
if (d < bestD && dx * fx + dz * fz > 0.3) { best = ped; bestD = d; }
}
if (best) {
angerPed(best, p.pos.x, p.pos.z);
S.wanted = Math.max(S.wanted, 1);
}
}

export function damagePlayer(amount, fromX, fromZ) {
if (S.screen !== 'play' || S.godTimer > 0) return;
if (S.armor > 0) {
const absorbed = Math.min(S.armor, amount * 0.6);
S.armor -= absorbed;
amount -= absorbed;
}
S.health -= amount;
S.hud?.flashDamage();
addShake(0.3);
S.audio?.hurt();
if (S.health <= 0) {
S.health = 0;
S.onWasted?.();
}
}

export function addShake(amount) {
S.shake = Math.min(1, S.shake + amount);
}

export function updatePlayer(dt) {
const p = S.player;
if (!p) return;
p.fireCooldown -= dt;
p.rpgCooldown -= dt;
p.punchCooldown -= dt;
updateRockets(dt);
if (p.reloadTimer > 0) {
p.reloadTimer -= dt;
if (p.reloadTimer <= 0) {
if (S.weapon === 'smg') S.smgAmmo = WEAPONS.smg.mag;
else if (S.weapon === 'pistol') S.ammo = TUNE.magSize;
}
}
S.playerFiredTimer -= dt;
S.godTimer -= dt;

if (S.driving) {
S.swimming = false;
updateDriving(dt);
return;
}

const wasSwim = S.swimming;
S.swimming = p.pos.x < -224;
if (S.swimming && !wasSwim) S.hud?.toast('Swimming — head for shore to get out.');

const a = axis();
const fwd = cameraForward();
const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
const move = new THREE.Vector3()
.addScaledVector(fwd, a.y)
.addScaledVector(right, a.x);
const moving = move.lengthSq() > 0.01;
const sprint = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
const speed = S.swimming ? 3.2 : sprint ? TUNE.sprintSpeed : TUNE.walkSpeed;
if (moving) {
move.normalize();
const wantHeading = Math.atan2(-move.z, move.x);
p.heading = dampAngle(p.heading, wantHeading, 12, dt);
p.pos.x += move.x * speed * dt;
p.pos.z += move.z * speed * dt;
p.moveSpeed = damp(p.moveSpeed, speed, 8, dt);
S.stats.distanceWalked += speed * dt;
} else {
p.moveSpeed = damp(p.moveSpeed, 0, 10, dt);
}
playerCollide(p);


if (input.pressed.has('Space') && p.grounded && !S.swimming) {
input.pressed.delete('Space');
p.vy = TUNE.jumpVel;
p.grounded = false;
S.audio?.jump();
}
if (S.swimming) {
p.grounded = true;
p.vy = 0;
}
if (!p.grounded) {
p.vy -= TUNE.gravity * dt;
p.pos.y += p.vy * dt;
if (p.pos.y <= 0.3) {
p.pos.y = 0.3;
p.vy = 0;
p.grounded = true;
}
}


p.aiming = input.mouseDown && S.weapon !== 'fists' && !S.swimming;
const curMag = S.weapon === 'smg' ? WEAPONS.smg.mag : TUNE.magSize;
const curAmmo = S.weapon === 'smg' ? S.smgAmmo : S.ammo;
p.gun.visible = (p.aiming || curAmmo < curMag) && (S.weapon === 'pistol' || S.weapon === 'smg');
p.rpgTube.visible = S.weapon === 'rpg';
if (p.aiming) {

const look = new THREE.Vector3();
S.camera.getWorldDirection(look);
p.heading = dampAngle(p.heading, Math.atan2(-look.z, look.x), 16, dt);
if (S.weapon === 'pistol' || S.weapon === 'smg') shoot();
else fireRpg();
}
if (input.mouseClicked && S.weapon === 'fists' && !S.swimming && p.punchCooldown <= 0) {
p.punchCooldown = 0.45;
punch();
}
if (input.pressed.has('KeyR')) { input.pressed.delete('KeyR'); startReload(); }


if (input.pressed.has('KeyF')) { input.pressed.delete('KeyF'); tryEnterCar(); }
if (input.pressed.has('KeyE')) { input.pressed.delete('KeyE'); S.onInteract?.(); }


const cars = [...S.traffic, ...S.police.map((pc) => pc.car)];
for (const car of cars) {
if (car.dead) continue;
const d = dist2D(car.pos.x, car.pos.z, p.pos.x, p.pos.z);
if (d < 2.6 && Math.abs(car.speed) > 6) {
damagePlayer(18, car.pos.x, car.pos.z);
p.pos.x += (p.pos.x - car.pos.x) * 0.6;
p.pos.z += (p.pos.z - car.pos.z) * 0.6;
car.speed *= 0.6;
}
}

if (S.driving && Math.abs(S.driving.speed) > 5) {
for (const ped of S.peds) {
if (ped.down) continue;
if (dist2D(ped.pos.x, ped.pos.z, S.driving.pos.x, S.driving.pos.z) < 2.4) {
knockPed(ped, S.driving.pos.x, S.driving.pos.z);
S.wanted = Math.max(S.wanted, 2);
addRespect(-5);
S.hud?.toast('You ran someone over! The police are coming.');
S.shake = Math.min(0.6, S.shake + 0.2);
S.audio?.thud(8);
}
}
}

p.rig.group.rotation.y = p.heading - Math.PI / 2;
if (S.swimming) {
p.rig.phase += Math.max(p.moveSpeed, 1.2) * dt * 1.9;
const s = Math.sin(p.rig.phase), c = Math.cos(p.rig.phase);
p.rig.group.rotation.x = damp(p.rig.group.rotation.x, -1.15, 6, dt);
p.rig.armL.rotation.x = s * 1.1 - 0.4;
p.rig.armR.rotation.x = -s * 1.1 - 0.4;
p.rig.elbowL.rotation.x = -0.3;
p.rig.elbowR.rotation.x = -0.3;
p.rig.legL.rotation.x = s * 0.35;
p.rig.legR.rotation.x = -s * 0.35;
p.rig.kneeL.rotation.x = -0.2;
p.rig.kneeR.rotation.x = -0.2;
p.rig.torso.rotation.x = 0;
p.rig.torso.rotation.y = 0;
p.rig.head.rotation.x = 0.35;
p.rig.head.rotation.y = 0;
p.rig.group.position.y = 0.05 + Math.abs(c) * 0.03;
} else {
p.rig.group.rotation.x = damp(p.rig.group.rotation.x, 0, 8, dt);
p.rig.head.rotation.x = damp(p.rig.head.rotation.x, 0, 8, dt);
animateRig(p.rig, p.moveSpeed, dt, p.aiming);
if (p.punchAnim > 0) {
p.punchAnim -= dt;
p.rig.armR.rotation.x = -1.7;
p.rig.elbowR.rotation.x = -0.1;
}
}
}

function updateDriving(dt) {
const car = S.driving;
const a = axis();
car.throttle = a.y > 0 ? 1 : 0;
car.brake = a.y < 0;
if (a.y < 0 && car.speed < 1) car.throttle = -0.6;
car.handbrake = input.keys.has('Space');
const shiftHeld = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
car.nitroActive = !!(car.upg?.nitro && shiftHeld && Math.abs(car.speed) > 5);
if (car.nitroActive && Math.random() < 0.5) {
S.effects?.smoke(car.pos.x - Math.cos(car.heading) * 2.5, 0.8, car.pos.z + Math.sin(car.heading) * 2.5, 0x66aaff);
}
const targetSteer = a.x * 0.55;
car.steer = damp(car.steer, targetSteer, 7, dt);
if (input.pressed.has('KeyF')) { input.pressed.delete('KeyF'); exitCar(); }
if (input.pressed.has('KeyE')) { input.pressed.delete('KeyE'); S.onInteract?.(); }
if (input.pressed.has('KeyH')) S.audio?.horn();

if (Math.abs(car.speed) > 12) {
for (const pc of S.police) {
if (dist2D(car.pos.x, car.pos.z, pc.car.pos.x, pc.car.pos.z) < 3.6 && !pc.rammed) {
pc.rammed = true;
S.wanted = Math.min(5, S.wanted + 1);
S.hud?.toast('You rammed a police car! Wanted level up.');
}
}
}
S.player.pos.copy(car.pos);
S.player.heading = car.heading;
S.audio?.setEngine(Math.abs(car.speed) / 40, true);
}

export function healPlayer(amount) {
S.health = clamp(S.health + amount, 0, TUNE.maxHealth);
}
