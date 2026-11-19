import { PLACES, TUNE } from './config.js';
import { S } from './state.js';
import { createCar } from './vehicles.js';
import { spawnRival } from './characters.js';
import { setWanted, spawnPoliceCar } from './police.js';
import { startMission } from './missions.js';
import { toggleMap } from './map.js';
import { openGarage } from './garage.js';
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
const opp = createCar('sedan', -210 - 3.4, -30, -Math.PI / 2, 0xffd23e, 'traffic');
opp.route = { axis: 'z', road: -210, side: -3.4, dir: 1, end: 150 };
opp.speed = 10;
S.traffic.push(opp);
S.hud?.setObjective('Lose the cops — break line of sight and stay quiet');
resetCamera(Math.PI - Math.PI / 2, 0.15);
return 4000;
},
shootout() {
S.dayTime = 0.42;
S.ammo = 9;
S.health = 74;
S.player.pos.set(24, 0.3, 150);
S.player.heading = Math.PI;
S.mission = { def: { title: 'Dockside Deal', steps: [{ label: "Take down Vince's crew" }] }, stepIdx: 0, combat: true, data: {} };
spawnRival(16, 150, { health: 60 });
spawnRival(14, 154, { health: 60 });
spawnRival(17, 146, { health: 60 });
S.godTimer = 999;
input.mouseDown = true;
S.hud?.setObjective('Take down Vince\'s crew (0/3)');
S.hud?.showStars(2);
resetCamera(Math.PI - S.player.heading, 0.18);
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

garage() {
S.dayTime = 0.36;
S.cash = 3200;
S.player.pos.set(-168, 0.3, 208);
S.player.heading = Math.PI * 0.75;
S.garage = { type: 'coupe', color: 0xc23b2e, engine: 1, armor: 0, nitro: 1, health: 100 };
openGarage();
return 2500;
},

wheel() {
S.dayTime = 0.42;
S.ammo = 9;
S.smgAmmo = 120;
S.weapon = 'smg';
S.health = 74;
S.player.pos.set(24, 0.3, 150);
S.player.heading = Math.PI;
S.mission = { def: { title: 'Dockside Deal', steps: [{ label: "Take down Vince's crew" }] }, stepIdx: 0, combat: true, data: {} };
spawnRival(16, 150, { health: 60 });
spawnRival(14, 154, { health: 60 });
spawnRival(17, 146, { health: 60 });
S.godTimer = 999;
input.keys.add('Tab');
S.hud?.setObjective('Weapon wheel — hold Tab, pick your tool');
S.hud?.showStars(2);
resetCamera(Math.PI - S.player.heading, 0.18);
return 2500;
},

roads() {
// Top-down check of a straight road: player stands MID-BLOCK on the
// N-S road x = -90 (z = -60, between the -90 and -30 crossings) with a
// steep axis-aligned camera at midday — the dashes must run dead
// straight down the lane centre, with straight sidewalks on both sides.
S.dayTime = 0.5;
S.cash = 2450;
S.health = 100;
S.player.pos.set(-90, 0.3, -60);
S.player.heading = 0;
resetCamera(0, 1.15);
return 2500;
},

drive() {
// Driving view along a straight road: eastbound on the N-S road x = -90.
S.dayTime = 0.36;
S.cash = 2450;
S.health = 100;
putPlayerInCar('coupe', 0xc23b2e, -90, -180, Math.PI / 2, 22);
input.keys.add('KeyW');
S.hud?.setObjective('Straight roads — follow the grid across Solmarina');
resetCamera(Math.PI - Math.PI / 2, 0.15);
return 4000;
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
