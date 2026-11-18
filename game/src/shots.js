import { PLACES, TUNE } from './config.js';
import { S } from './state.js';
import { createCar } from './vehicles.js';
import { spawnRival } from './characters.js';
import { setWanted, spawnPoliceCar } from './police.js';
import { startMission } from './missions.js';
import { toggleMap } from './map.js';
import { input } from './input.js';
import { resetCamera } from './camera.js';

let pending = null;

function putPlayerInCar(type, color, x, z, heading, speed) {
const car = createCar(type, x, z, heading, color, 'player');
car.speed = speed;
S.driving = car;
S.player.rig.group.visible = false;
S.player.pos.copy(car.pos);
S.player.heading = heading;
return car;
}

const STAGERS = {

chase() {
S.dayTime = 0.74;
S.cash = 2450;
S.health = 82;
S.heliCine = { ahead: 90, alt: 22 };
putPlayerInCar('coupe', 0xc23b2e, -210, 40, Math.PI / 2, 27);
input.keys.add('KeyW');
setWanted(4, '');
S.hud?.showStars(4);

spawnPoliceCar(-210, 78, Math.PI / 2);
spawnPoliceCar(-204, -6, -Math.PI / 2);
S.hud?.setObjective('Lose the cops — break line of sight and stay quiet');
resetCamera(Math.PI - Math.PI / 2, 0.15);
return 4000;
},



story() {
S.dayTime = 0.36;
S.player.pos.set(-30, 0.3, 30);
S.player.heading = Math.PI / 4;
for (const ped of S.peds) {
if (Math.hypot(ped.pos.x + 30, ped.pos.z - 30) < 20) {
ped.pos.x += 60;
ped.pos.z += 60;
ped.target = { x: ped.pos.x + 40, z: ped.pos.z };
}
}
S.hud?.showScreen('none');
startMission();
resetCamera(Math.PI - S.player.heading, 0.3);
return 5500;
},

drive() {
S.dayTime = 0.75;
S.cash = 1250;
putPlayerInCar('sedan', 0x2e6bc2, -210, -120, -Math.PI / 2, 21);
input.keys.add('KeyW');
S.hud?.setObjective('Drive to the Rusty Anchor — 412m');
S.hud?.setRadio('TIDE FM 88.5 — Coastal Chill');
resetCamera(Math.PI + Math.PI / 2, 0.3);
return 3000;
},



shootout() {
S.dayTime = 0.25;
S.ammo = 9;
S.health = 74;
S.player.pos.set(6, 0.3, 148);
S.player.heading = -Math.PI / 2;
S.mission = { def: { title: 'Dockside Deal', steps: [{ label: "Take down Vince's crew" }] }, stepIdx: 0, combat: true, data: {} };
spawnRival(0, 158, { health: 60 });
spawnRival(11, 156, { health: 60 });
spawnRival(-9, 157, { health: 60 });
S.godTimer = 999;
input.mouseDown = true;
S.hud?.setObjective('Take down Vince\'s crew (0/3)');
S.hud?.showStars(2);
resetCamera(Math.PI - S.player.heading, 0.3);
return 3500;
},
map() {
S.dayTime = 0.36;
S.cash = 2450;
S.player.pos.set(-30, 0.3, 30);
S.player.heading = Math.PI / 4;
startMission();
toggleMap();
return 4500;
},
};

export function stageShotIfRequested() {
const params = new URLSearchParams(window.location.search);
const name = params.get('shot');
if (!name || !STAGERS[name]) return false;
const settleMs = STAGERS[name]();


pending = { readyAt: performance.now() + settleMs };
return true;
}

export function updateShots() {
if (!pending) return;
if (performance.now() >= pending.readyAt) {
pending = null;
input.keys.delete('KeyW');
window.__shotReady = true;
}
}
