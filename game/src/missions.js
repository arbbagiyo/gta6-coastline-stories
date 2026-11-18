import * as THREE from 'three';
import { PLACES, CHARACTERS, TUNE } from './config.js';
import { S } from './state.js';
import { clamp, damp, angleDelta, dist2D, makeRng } from './util.js';
import { createCar, updateCarPhysics } from './vehicles.js';
import { spawnRival, clearRivals, damageRival } from './characters.js';
import { setWanted, clearPolice } from './police.js';

const GOLD = 0xffc94d;

function makeBeacon(color = GOLD) {
const g = new THREE.Group();
const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false });
const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.25, 24), ringMat);
ring.position.y = 0.35;
const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 16, 12, 1, true), beamMat);
beam.position.y = 8;
g.add(ring, beam);
g.userData = { ringMat, beamMat, phase: Math.random() * 6 };
return g;
}

function pulseBeacon(beacon, dt) {
const u = beacon.userData;
u.phase += dt * 2.4;
const s = 1 + Math.sin(u.phase) * 0.12;
beacon.scale.set(s, 1, s);
u.beamMat.opacity = 0.13 + Math.sin(u.phase) * 0.06;
}

const MISSIONS = [
{
id: 'first-delivery',
title: 'First Delivery',
giver: 'theo',
start: { x: PLACES.theoGarage.x, z: PLACES.theoGarage.z },
brief: 'Theo needs a package run across town. No questions, no stops.',
steps: [
{ type: 'dialogue', lines: [
{ who: 'theo', text: 'Lena. You came back. Solmarina missed you — the docks, the heat, all of it.' },
{ who: 'lena', text: 'I came back because you called three times, Theo. What is it this time?' },
{ who: 'theo', text: 'A package. Rusty Anchor, Old Town. Rosa is waiting. Drive my coupe — and Lena? No stops.' },
] },
{ type: 'enterCar', label: 'Get in Theo\'s coupe', x: PLACES.theoGarage.x + 6, z: PLACES.theoGarage.z, car: { type: 'coupe', color: 0xc23b2e, heading: 0 } },
{ type: 'goto', label: 'Drive to the Rusty Anchor', x: PLACES.rustyAnchor.x, z: PLACES.rustyAnchor.z, radius: 9 },
{ type: 'dialogue', lines: [
{ who: 'rosa', text: 'You must be Lena. Theo talks about you like you are a legend. The package?' },
{ who: 'lena', text: 'Here. What is in it?' },
{ who: 'rosa', text: 'Rule one of Solmarina: you do not ask. Rule two: you get paid. Four hundred.' },
] },
],
},
{
id: 'tail-the-courier',
title: 'Tail the Courier',
giver: 'rosa',
start: { x: PLACES.rustyAnchor.x, z: PLACES.rustyAnchor.z },
brief: 'Someone is skimming Rosa\'s shipments. Follow the courier — don\'t be seen.',
steps: [
{ type: 'dialogue', lines: [
{ who: 'rosa', text: 'My shipments keep arriving light. A courier leaves the plaza at dusk — follow him. Do not let him see you.' },
{ who: 'lena', text: 'And if he spots me?' },
{ who: 'rosa', text: 'Then he runs, and we learn nothing. Stay back. Use a car.' },
] },
{ type: 'goto', label: 'Get to the plaza stakeout', x: PLACES.plaza.x, z: PLACES.plaza.z, radius: 10 },
{ type: 'follow', label: 'Tail the courier — stay back, don\'t lose him' },
{ type: 'dialogue', lines: [
{ who: 'lena', text: 'He went into the port warehouse. Vince Kroll\'s place. Rosa was right.' },
{ who: 'rosa', text: '(phone) Vince? That snake. Meet me at the docks, Lena. We are taking this back.' },
] },
],
},
{
id: 'dockside-deal',
title: 'Dockside Deal',
giver: 'rosa',
start: { x: PLACES.portWarehouse.x, z: PLACES.portWarehouse.z },
brief: 'Confront Vince\'s crew at the warehouse. Take back what is Rosa\'s.',
steps: [
{ type: 'dialogue', lines: [
{ who: 'rosa', text: 'Vince is inside with his crew. The briefcase is ours. You go in loud — I will watch the door.' },
{ who: 'lena', text: 'Loud is my favourite volume.' },
] },
{ type: 'goto', label: 'Enter the warehouse yard', x: PLACES.portWarehouse.x, z: PLACES.portWarehouse.z, radius: 12 },
{ type: 'eliminate', label: 'Take down Vince\'s crew', spawns: [
{ x: 14, z: 178 }, { x: -2, z: 192 }, { x: 18, z: 196 }, { x: -12, z: 184 }, { x: 6, z: 206 },
] },
{ type: 'pickup', label: 'Take the briefcase', x: 6, z: 186 },
{ type: 'goto', label: 'Get the briefcase to the safehouse', x: PLACES.safehouse.x, z: PLACES.safehouse.z, radius: 9 },
{ type: 'dialogue', lines: [
{ who: 'rosa', text: 'The case, the ledger, all of it. Vince will not forget this, Lena. Neither will I. Nine hundred.' },
{ who: 'lena', text: 'Let him come. Solmarina is my city too.' },
] },
],
},
{
id: 'heat-wave',
title: 'Heat Wave',
giver: 'park',
start: { x: PLACES.safehouse.x, z: PLACES.safehouse.z },
brief: 'Detective Park is squeezing the whole coast. Lose the heat and lay low.',
steps: [
{ type: 'dialogue', lines: [
{ who: 'ana', text: '(phone) Miss Maris. Three days back and the docks are already burning. I am watching you.' },
{ who: 'lena', text: 'Then watch closely, Detective. You will see a law-abiding citizen.' },
{ who: 'ana', text: 'Funny. My cruisers say otherwise. Drive safe.' },
] },
{ type: 'wanted', level: 3, label: 'The police are on you!' },
{ type: 'loseWanted', label: 'Lose the cops — break line of sight and stay quiet' },
{ type: 'goto', label: 'Lay low at the safehouse', x: PLACES.safehouse.x, z: PLACES.safehouse.z, radius: 9 },
{ type: 'dialogue', lines: [
{ who: 'rosa', text: 'Park backed off — for now. She plays a long game, Lena. So do we. Twelve hundred.' },
] },
],
},
{
id: 'coastline-run',
title: 'The Coastline Run',
giver: 'theo',
start: { x: PLACES.safehouse.x, z: PLACES.safehouse.z },
brief: 'Vince is fleeing by boat from the marina. Run the coast and end it.',
steps: [
{ type: 'dialogue', lines: [
{ who: 'theo', text: 'Vince is running — boat at the marina, tonight. This is our one shot to end it.' },
{ who: 'lena', text: 'Then we run the coast. You drive backup. I go in first.' },
{ who: 'rosa', text: 'Bring me his ledger, Lena. And come back breathing.' },
] },
{ type: 'wanted', level: 2, label: 'Vince called in favours — the police are out!' },
{ type: 'enterCar', label: 'Get in Theo\'s coupe', x: PLACES.safehouse.x + 6, z: PLACES.safehouse.z, car: { type: 'coupe', color: 0x2e6bc2, heading: Math.PI } },
{ type: 'goto', label: 'Race to the marina docks', x: PLACES.marinaDock.x, z: PLACES.marinaDock.z, radius: 12 },
{ type: 'eliminate', label: 'Clear the dock — Vince\'s crew is waiting', spawns: [
{ x: -220, z: -128 }, { x: -226, z: -112 }, { x: -214, z: -118 }, { x: -228, z: -132 },
] },
{ type: 'pickup', label: 'Take Vince\'s ledger', x: -226, z: -120 },
{ type: 'dialogue', lines: [
{ who: 'vince', text: 'You… you do not understand what you just took, Maris. The whole coast will come for you.' },
{ who: 'lena', text: 'Let them. I live here.' },
{ who: 'rosa', text: '(phone) The ledger is ours. The coast is ours. Solmarina owes you one, Lena.' },
] },
],
},
];

let startBeacon = null;
let stepBeacon = null;
let courierCar = null;
let courierRoute = null;
let courierWp = 0;
let spotted = 0;
let spottedBoost = 0;
let lostTimer = 0;
let stuckTimer = 0;
let stepTimer = 0;
let pickupMesh = null;
const missionCars = [];

function setStepBeacon(x, z) {
clearStepBeacon();
stepBeacon = makeBeacon();
stepBeacon.position.set(x, 0.3, z);
S.scene.add(stepBeacon);
S.marker = { x, z };
}

function clearStepBeacon() {
if (stepBeacon) { S.scene.remove(stepBeacon); stepBeacon = null; }
S.marker = null;
}

function currentStep() {
return S.mission ? S.mission.def.steps[S.mission.stepIdx] : null;
}

export function missionIndex() {
return S.missionIndex;
}

export function nextMissionDef() {
return MISSIONS[S.missionIndex] || null;
}

export function jobStatuses() {
return MISSIONS.map((d, i) => ({ title: d.title, status: i < S.missionIndex ? 'done' : (S.mission && S.missionIndex === i ? 'active' : 'locked') }));
}

export function showStartBeacon() {
const def = nextMissionDef();
if (startBeacon) { S.scene.remove(startBeacon); startBeacon = null; }
if (!def || S.mission) return;
startBeacon = makeBeacon(0x7dff9a);
startBeacon.position.set(def.start.x, 0.3, def.start.z);
S.scene.add(startBeacon);
}

export function startMission() {
const def = nextMissionDef();
if (!def || S.mission) return;
clearRivals();
S.mission = { def, stepIdx: 0, combat: false, data: {} };
if (startBeacon) { S.scene.remove(startBeacon); startBeacon = null; }
S.hud?.showBanner(def.title, def.brief);
S.audio?.missionStart();
enterStep();
}

function enterStep() {
const step = currentStep();
if (!step) { completeMission(); return; }
stepTimer = 0;
S.mission.data = {};
if (step.type === 'dialogue') {
S.hud?.setObjective(S.mission.def.title);
S.hud?.showDialogue(step.lines, () => advanceStep());
return;
}
S.hud?.setObjective(step.label || step.type);
if (step.type === 'goto' || step.type === 'enterCar') {
setStepBeacon(step.x, step.z);
if (step.type === 'enterCar' && step.car) {

const storyCar = createCar(step.car.type, step.x, step.z, step.car.heading || 0, step.car.color, 'parked');
S.parked.push(storyCar);
}
} else if (step.type === 'pickup') {
setStepBeacon(step.x, step.z);
const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.25),
new THREE.MeshPhongMaterial({ color: 0x6a4a22, shininess: 40 }));
caseMesh.position.set(step.x, 0.6, step.z);
caseMesh.castShadow = true;
S.scene.add(caseMesh);
pickupMesh = caseMesh;
} else if (step.type === 'eliminate') {
S.mission.combat = true;
for (const s of step.spawns) spawnRival(s.x, s.z, { health: 60 });
S.hud?.setObjective(`${step.label} (0/${step.spawns.length})`);
} else if (step.type === 'follow') {
startCourier();
} else if (step.type === 'wanted') {
setWanted(step.level, step.label);
advanceStep();
}
}

function advanceStep() {
if (!S.mission) return;
S.mission.stepIdx += 1;
S.mission.combat = false;
clearStepBeacon();
enterStep();
}

function completeMission() {
const def = S.mission.def;
const reward = TUNE.missionReward[S.missionIndex] || 500;
S.cash += reward;
S.missionIndex += 1;
S.stats.missionsDone += 1;
clearRivals();
clearStepBeacon();
S.mission = null;
S.hud?.setObjective('');
S.hud?.showBanner('Mission Passed!', `+ $${reward}  —  ${def.title} complete.`);
S.audio?.missionPass();
S.save?.();
if (S.missionIndex >= MISSIONS.length) {
S.hud?.showBanner('STORY COMPLETE', 'You own the coastline now. Free roam: courier jobs, shells, and the whole city.');
S.audio?.missionPass();
} else {
showStartBeacon();
}
}

export function failMission(reason) {
if (!S.mission) return;
const def = S.mission.def;
clearRivals();
clearStepBeacon();
clearCourier();
S.mission = null;
S.hud?.showBanner('Mission Failed', reason || 'Try again.');
S.audio?.missionFail();
showStartBeacon();
S.missionRetry = def;
}

export function restartMissionAfterIncident() {

const def = S.mission ? S.mission.def : S.missionRetry;
clearRivals();
clearStepBeacon();
clearCourier();
clearPolice();
setWanted(0);
S.mission = null;
if (def) {
const idx = MISSIONS.indexOf(def);
if (idx >= 0) S.missionIndex = idx;
}
S.health = TUNE.maxHealth;
S.armor = 0;
S.ammo = TUNE.magSize;
const start = def ? def.start : PLACES.safehouse;
S.player.pos.set(start.x, 0.3, start.z);
S.player.heading = 0;
if (S.driving) {
S.driving.driver = 'parked';
S.parked.push(S.driving);
S.driving = null;
S.player.rig.group.visible = true;
}
showStartBeacon();
S.hud?.setObjective('');
}

function startCourier() {


const route = [
{ x: 30, z: 30 }, { x: 30, z: 150 }, { x: -30, z: 150 }, { x: -30, z: 90 },
{ x: 90, z: 90 }, { x: 90, z: 150 }, { x: 30, z: 150 }, { x: 30, z: 210 },
{ x: 6, z: 210 },
];
courierRoute = route;
courierWp = 0;
spotted = 0;
spottedBoost = 0;
lostTimer = 0;
stuckTimer = 0;
courierCar = createCar('van', 30, 30, -Math.PI / 2, 0xb8b0a0, 'mission');
missionCars.push(courierCar);
setStepBeacon(30, 30);
}

function clearCourier() {
if (courierCar) {
S.scene.remove(courierCar.mesh);
missionCars.splice(missionCars.indexOf(courierCar), 1);
courierCar = null;
}
courierRoute = null;
}

function updateCourier(dt) {
if (!courierCar || !courierRoute) return;
const wp = courierRoute[courierWp];
const dx = wp.x - courierCar.pos.x, dz = wp.z - courierCar.pos.z;
const d = Math.hypot(dx, dz);
if (d < 8) {
courierWp += 1;
if (courierWp >= courierRoute.length) {
clearCourier();
advanceStep();
return;
}
}
const want = Math.atan2(-dz, dx);
courierCar.steer = damp(courierCar.steer, clamp(angleDelta(courierCar.heading, want) * 2.2, -0.55, 0.55), 5, dt);
const cruise = spottedBoost > 0 ? 26 : 15;
courierCar.throttle = courierCar.speed < cruise ? 1 : 0;
courierCar.brake = courierCar.speed > cruise + 2;
updateCarPhysics(courierCar, dt);


if (courierCar.throttle > 0 && Math.abs(courierCar.speed) < 1.5) {
stuckTimer += dt;
if (stuckTimer > 2.5) {
stuckTimer = 0;
courierWp = Math.min(courierWp + 1, courierRoute.length - 1);
}
} else {
stuckTimer = 0;
}
if (stepBeacon) stepBeacon.position.set(courierCar.pos.x, 0.3, courierCar.pos.z);
S.marker = { x: courierCar.pos.x, z: courierCar.pos.z };


const pd = dist2D(S.player.pos.x, S.player.pos.z, courierCar.pos.x, courierCar.pos.z);
spottedBoost -= dt;
if (pd < 10) spotted += dt * 0.55;
else spotted -= dt * 0.3;
spotted = clamp(spotted, 0, 1);
S.hud?.showSpotted(spotted);
if (spotted >= 1) {
spotted = 0.4;
spottedBoost = 12;
S.hud?.toast('Spotted! The courier is speeding up — fall back!');
S.audio?.alert();
}
if (pd > 50) {
lostTimer += dt;
S.hud?.setObjective(`Tail the courier — DON'T LOSE HIM (${Math.max(0, 6 - lostTimer).toFixed(0)}s)`);
if (lostTimer > 6) {
S.hud?.showSpotted(0);
failMission('You lost the courier.');
}
} else {
lostTimer = 0;
S.hud?.setObjective('Tail the courier — stay back, don\'t lose him');
}
}

export function updateMission(dt) {
if (startBeacon) pulseBeacon(startBeacon, dt);
if (stepBeacon) pulseBeacon(stepBeacon, dt);
if (pickupMesh) {
pickupMesh.rotation.y += dt * 1.5;
pickupMesh.position.y = 0.6 + Math.sin(performance.now() * 0.003) * 0.12;
}

if (!S.mission && !S.dialogue && nextMissionDef()) {
const def = nextMissionDef();
const d = dist2D(S.player.pos.x, S.player.pos.z, def.start.x, def.start.z);
if (d < 6) {
S.hud?.setPrompt(`[E] Start mission: ${def.title}`);
S.nearMissionStart = true;
} else if (S.nearMissionStart) {
S.nearMissionStart = false;
S.hud?.setPrompt('');
}
}
updateCourierJob(dt);
updateShells(dt);
if (!S.mission || S.dialogue) return;
const step = currentStep();
if (!step) return;
stepTimer += dt;
const p = S.player.pos;
if (step.type === 'goto') {
const d = dist2D(p.x, p.z, step.x, step.z);
S.hud?.setObjective(`${step.label} — ${Math.round(d)}m`);
if (d < step.radius) advanceStep();
} else if (step.type === 'enterCar') {
if (S.driving) advanceStep();
else S.hud?.setObjective(`${step.label} — press F near a car`);
} else if (step.type === 'eliminate') {
const left = S.rivals.filter((r) => !r.down).length;
S.hud?.setObjective(`${step.label} (${step.spawns.length - left}/${step.spawns.length})`);
if (left === 0) advanceStep();
} else if (step.type === 'follow') {
updateCourier(dt);
} else if (step.type === 'loseWanted') {
if (S.wanted === 0) advanceStep();
else S.hud?.setObjective(`${step.label} — wanted ${S.wanted}★`);
} else if (step.type === 'pickup') {
const d = dist2D(p.x, p.z, step.x, step.z);
if (d < 3.5) {
S.hud?.setPrompt('[E] Pick it up');
S.nearPickup = true;
} else if (S.nearPickup) {
S.nearPickup = false;
S.hud?.setPrompt('');
}
}
}

export function onInteract() {
if (S.dialogue) return;
if (S.nearMissionStart && !S.mission) {
S.nearMissionStart = false;
S.hud?.setPrompt('');
startMission();
return;
}
if (S.mission && currentStep()?.type === 'pickup' && S.nearPickup) {
S.nearPickup = false;
S.hud?.setPrompt('');
if (pickupMesh) { S.scene.remove(pickupMesh); pickupMesh = null; }
S.audio?.pickup();
advanceStep();
return;
}
if (S.nearCourier && !S.courier) {
startCourierJob();
}
}

export function onRivalDown() {

}

const JOB_DESTINATIONS = [
{ x: PLACES.hospital.x, z: PLACES.hospital.z, name: 'St. Marisol Hospital' },
{ x: PLACES.policeStation.x, z: PLACES.policeStation.z, name: 'Police Station' },
{ x: PLACES.lighthouse.x, z: PLACES.lighthouse.z, name: 'The Lighthouse' },
{ x: PLACES.theoGarage.x, z: PLACES.theoGarage.z, name: "Theo's Garage" },
{ x: PLACES.plaza.x, z: PLACES.plaza.z, name: 'Sunset Plaza' },
{ x: PLACES.marinaDock.x, z: PLACES.marinaDock.z, name: 'Marina Docks' },
];

let jobBeacon = null;

export function courierDepotBeacon() {
const b = makeBeacon(0x4dc8ff);
b.position.set(PLACES.courierDepot.x, 0.3, PLACES.courierDepot.z);
S.scene.add(b);
jobBeacon = b;
}

function startCourierJob() {
const rng = makeRng((Math.random() * 1e9) | 0);
const dest = JOB_DESTINATIONS[(rng() * JOB_DESTINATIONS.length) | 0];
const dist = dist2D(S.player.pos.x, S.player.pos.z, dest.x, dest.z);
S.courier = { x: dest.x, z: dest.z, name: dest.name, timeLeft: clamp(dist / 9, 45, 120) };
setStepBeacon(dest.x, dest.z);
S.hud?.toast(`Courier job: deliver to ${dest.name} before the timer runs out!`);
S.audio?.missionStart();
S.nearCourier = false;
S.hud?.setPrompt('');
}

function updateCourierJob(dt) {
if (jobBeacon) pulseBeacon(jobBeacon, dt);
if (!S.courier && !S.mission) {
const d = dist2D(S.player.pos.x, S.player.pos.z, PLACES.courierDepot.x, PLACES.courierDepot.z);
if (d < 6) {
S.hud?.setPrompt('[E] Take a courier job (+$150)');
S.nearCourier = true;
} else if (S.nearCourier) {
S.nearCourier = false;
S.hud?.setPrompt('');
}
}
if (!S.courier) return;
S.courier.timeLeft -= dt;
const d = dist2D(S.player.pos.x, S.player.pos.z, S.courier.x, S.courier.z);
S.hud?.setObjective(`Courier: ${S.courier.name} — ${Math.round(d)}m — ${Math.max(0, S.courier.timeLeft).toFixed(0)}s`);
if (d < 9) {
S.cash += TUNE.courierPay;
S.stats.jobsDone += 1;
S.hud?.showBanner('Delivery Complete!', `+ $${TUNE.courierPay}`);
S.audio?.missionPass();
S.courier = null;
clearStepBeacon();
S.hud?.setObjective('');
S.save?.();
} else if (S.courier.timeLeft <= 0) {
S.hud?.toast('Delivery failed — too slow.');
S.courier = null;
clearStepBeacon();
S.hud?.setObjective('');
}
}

const SHELL_SPOTS = [
{ x: -221, z: -180 }, { x: -221, z: -60 }, { x: -221, z: 40 }, { x: -221, z: 150 },
{ x: -222, z: -108 }, { x: -221, z: 200 }, { x: 100, z: -199 }, { x: -120, z: 199 },
{ x: 199, z: 60 }, { x: 40, z: -139 },
];

export function createShells() {
const geo = new THREE.SphereGeometry(0.42, 8, 6);
geo.scale(1, 0.55, 1);
for (const spot of SHELL_SPOTS) {
const m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
color: 0xff9ad5, emissive: 0x881155, shininess: 90,
}));
m.position.set(spot.x, 0.7, spot.z);
S.scene.add(m);
S.shells.push({ mesh: m, x: spot.x, z: spot.z, taken: false });
}
}

function updateShells(dt) {
for (const s of S.shells) {
if (s.taken) continue;
s.mesh.rotation.y += dt * 2;
s.mesh.position.y = 0.7 + Math.sin(performance.now() * 0.002 + s.x) * 0.15;
if (dist2D(S.player.pos.x, S.player.pos.z, s.x, s.z) < 2.2) {
s.taken = true;
S.scene.remove(s.mesh);
S.shellsFound += 1;
S.cash += TUNE.shellPay;
S.hud?.toast(`Shell found! ${S.shellsFound}/${TUNE.shellCount} — +$${TUNE.shellPay}`);
S.audio?.pickup();
S.save?.();
}
}
}

export function restoreShells(foundCount) {
let taken = 0;
for (const s of S.shells) {
if (taken < foundCount) {
s.taken = true;
S.scene.remove(s.mesh);
taken += 1;
}
}
}
