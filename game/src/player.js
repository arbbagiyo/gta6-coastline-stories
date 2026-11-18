import * as THREE from 'three';
import { TUNE, PALETTE } from './config.js';
import { S } from './state.js';
import { clamp, damp, dampAngle, angleDelta, circleVsBox, dist2D } from './util.js';
import { buildPersonRig, animateRig, knockPed } from './characters.js';
import { nearestCar, respawnParkedCar } from './vehicles.js';
import { input, axis } from './input.js';
import { cameraForward } from './camera.js';

const raycaster = new THREE.Raycaster();

export function createPlayer(x, z, heading) {
const rig = buildPersonRig({ face: 'lena', shirt: 0x2e8a6a, pants: 0x2a3a5a, skin: 0xe8c39a, cap: null });
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
S.player = player;
return player;
}

function playerCollide(p) {
for (const b of S.colliders) {
const hit = circleVsBox(p.pos.x, p.pos.z, 0.55, b);
if (hit) { p.pos.x = hit.x; p.pos.z = hit.z; }
}
p.pos.x = clamp(p.pos.x, -233, 238);
p.pos.z = clamp(p.pos.z, -238, 238);
}

function tryEnterCar() {
const car = nearestCar(S.player.pos.x, S.player.pos.z, 4.5);
if (!car) return;

if (car.driver === 'traffic') {
S.audio?.carDoor();
S.hud?.toast('Car jacked — the driver fled!');
S.wanted = Math.max(S.wanted, 1);
S.stats.carsStolen += 1;
S.traffic.splice(S.traffic.indexOf(car), 1);
} else {
S.audio?.carDoor();
S.stats.carsStolen += 1;
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
if (S.ammo <= 0) {
S.audio?.click();
startReload();
return;
}
p.fireCooldown = 0.16;
S.ammo -= 1;
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
const killed = damageRivalRef(bestRival, 34, p.pos.x, p.pos.z);
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
if (p.reloadTimer > 0 || S.ammo === TUNE.magSize) return;
p.reloadTimer = 1.3;
S.audio?.reload();
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
if (p.reloadTimer > 0) {
p.reloadTimer -= dt;
if (p.reloadTimer <= 0) S.ammo = TUNE.magSize;
}
S.playerFiredTimer -= dt;
S.godTimer -= dt;

if (S.driving) {
updateDriving(dt);
return;
}

const a = axis();
const fwd = cameraForward();
const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
const move = new THREE.Vector3()
.addScaledVector(fwd, a.y)
.addScaledVector(right, a.x);
const moving = move.lengthSq() > 0.01;
const sprint = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
const speed = sprint ? TUNE.sprintSpeed : TUNE.walkSpeed;
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


if (input.pressed.has('Space') && p.grounded) {
p.vy = TUNE.jumpVel;
p.grounded = false;
S.audio?.jump();
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


p.aiming = input.mouseDown && S.weapon === 'pistol';
p.gun.visible = p.aiming || S.ammo < TUNE.magSize;
if (p.aiming) {

const look = new THREE.Vector3();
S.camera.getWorldDirection(look);
p.heading = dampAngle(p.heading, Math.atan2(-look.z, look.x), 16, dt);
shoot();
}
if (input.pressed.has('KeyR')) startReload();


if (input.pressed.has('KeyF')) tryEnterCar();
if (input.pressed.has('KeyE')) S.onInteract?.();


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
S.hud?.toast('You ran someone over! The police are coming.');
S.shake = Math.min(0.6, S.shake + 0.2);
S.audio?.thud(8);
}
}
}

p.rig.group.rotation.y = p.heading - Math.PI / 2;
animateRig(p.rig, p.moveSpeed, dt, p.aiming);
}

function updateDriving(dt) {
const car = S.driving;
const a = axis();
car.throttle = a.y > 0 ? 1 : 0;
car.brake = a.y < 0;
if (a.y < 0 && car.speed < 1) car.throttle = -0.6;
car.handbrake = input.keys.has('Space');
const targetSteer = a.x * 0.55;
car.steer = damp(car.steer, targetSteer, 7, dt);
if (input.pressed.has('KeyF')) exitCar();
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
