import * as THREE from 'three';
import { WORLD, PLACES, TUNE } from './config.js';
import { S, resetRunState } from './state.js';
import { createCity } from './city.js';
import { createTraffic, updateVehicles } from './vehicles.js';
import { createPedestrians, updatePedestrians, updateRivals, damageRival, clearRivals } from './characters.js';
import { createPlayer, updatePlayer, damagePlayer, setDamageRival } from './player.js';
import { updatePolice, clearPolice, setWanted } from './police.js';
import { updateMission, showStartBeacon, courierDepotBeacon, createShells, restoreShells, onInteract, onRivalDown, restartMissionAfterIncident } from './missions.js';
import { Effects } from './effects.js';
import { AudioEngine } from './audio.js';
import { HUD } from './hud.js';
import { initInput, input, endFrameInput } from './input.js';
import { updateCamera, addShake, resetCamera } from './camera.js';
import { saveGame, loadGame, applySave, hasSave } from './save.js';
import { stageShotIfRequested, updateShots } from './shots.js';
import { toggleMap, closeMap, updateMap, isMapOpen } from './map.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d8);
scene.fog = new THREE.Fog(0x87b5d8, 120, 420);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 40, 80);
S.scene = scene;
S.camera = camera;
S.renderer = renderer;

window.addEventListener('resize', () => {
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth, window.innerHeight);
});

const city = createCity();
S.effects = new Effects(scene);
S.audio = new AudioEngine();
setDamageRival(damageRival);
S.playerDamage = damagePlayer;
S.onInteract = onInteract;
S.save = saveGame;
createTraffic();
createPedestrians();
createPlayer(PLACES.safehouse.x, PLACES.safehouse.z, Math.PI * 0.75);
createShells();
courierDepotBeacon();

const hud = new HUD({
onStart: (useSave) => startGame(useSave),
onResume: () => resumeGame(),
});
S.hud = hud;
hud.init();
hud.setRadio('TIDE FM 88.5 — Coastal Chill');
hud.setSaveInfo(hasSave(), loadGame());

initInput(canvas, {
onKey: (code) => {
if (code === 'KeyM' && S.screen === 'play') toggleMap();
if (code === 'KeyN') {
const muted = S.audio.toggleMute();
hud.toast(muted ? 'Sound off' : 'Sound on');
}
if (code === 'KeyQ' && S.screen === 'play') S.audio.nextStation();
if (code === 'Digit1' && S.screen === 'play') S.weapon = 'fists';
if (code === 'Digit2' && S.screen === 'play') S.weapon = 'pistol';
if (code === 'Digit3' && S.screen === 'play') S.weapon = 'rpg';
if ((code === 'Escape' || code === 'KeyP') && S.screen === 'play') {
if (isMapOpen()) closeMap();
else pauseGame();
} else if ((code === 'Escape' || code === 'KeyP') && S.screen === 'pause') resumeGame();
},
});
resetCamera(Math.PI - S.player.heading, 0.32);

let incidentTimer = 0;
let incidentKind = null;
let autosaveTimer = 0;
let attractAngle = 0;

function startGame(useSave) {
S.audio.init();
if (useSave) {
const data = loadGame();
if (data) applySave(data, restoreShells);
} else {
resetRunState();
}
S.screen = 'play';
hud.showScreen('none');
showStartBeacon();
if (S.missionIndex >= 5) {
hud.setObjective('');
hud.toast('Free roam — courier jobs at the depot, shells on the beach.');
} else {
hud.toast('Follow the green beacon to start your next mission.');
}
hud.showStars(S.wanted);
resetCamera(Math.PI - S.player.heading, 0.32);
const params = new URLSearchParams(window.location.search);
if (params.get('shot')) stageShotIfRequested();
}

function pauseGame() {
if (S.screen !== 'play') return;
S.screen = 'pause';
hud.showScreen('pause');
saveGame();
document.exitPointerLock?.();
}

function resumeGame() {
if (S.screen !== 'pause') return;
S.screen = 'play';
hud.showScreen('none');
}

function onWasted() {
if (S.screen !== 'play') return;
S.screen = 'wasted';
incidentKind = 'wasted';
incidentTimer = 2.6;
hud.showScreen('wasted');
document.exitPointerLock?.();
S.audio.missionFail();
}

function onBusted() {
if (S.screen !== 'play') return;
S.screen = 'busted';
incidentKind = 'busted';
incidentTimer = 2.6;
hud.showScreen('busted');
document.exitPointerLock?.();
S.audio.missionFail();
}

S.onWasted = onWasted;
S.onBusted = onBusted;

function resolveIncident() {
const hadMission = !!S.mission;
if (incidentKind === 'wasted') {
S.cash = Math.max(0, S.cash - 200);
hud.toast('You woke up at St. Marisol Hospital. -$200 medical bill.');
} else {
S.cash = Math.max(0, S.cash - 300);
hud.toast('Released from the station. -$300 in fines.');
}
if (hadMission) {
restartMissionAfterIncident();
} else {
clearRivals();
clearPolice();
setWanted(0);
S.health = TUNE.maxHealth;
S.armor = 0;
S.ammo = TUNE.magSize;
const spot = incidentKind === 'wasted' ? PLACES.hospital : PLACES.policeStation;
if (S.driving) {
S.driving.driver = 'parked';
S.parked.push(S.driving);
S.driving = null;
S.player.rig.group.visible = true;
}
S.player.pos.set(spot.x, 0.3, spot.z);
S.player.heading = 0;
showStartBeacon();
}
S.screen = 'play';
hud.showScreen('none');
saveGame();
}

const shotParams = new URLSearchParams(window.location.search);
if (shotParams.get('shot') === 'title') {
setTimeout(() => { window.__shotReady = true; }, 3000);
} else if (shotParams.get('shot')) {
S.audio.init();
S.screen = 'play';
hud.showScreen('none');
showStartBeacon();
stageShotIfRequested();
}

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;

function frame(now) {
requestAnimationFrame(frame);


const rawDt = Math.min((now - last) / 1000, 1);
let dt = Math.min((now - last) / 1000, 0.1);
last = now;

if (S.screen === 'title') {

attractAngle += dt * 0.06;
const cx = PLACES.plaza.x, cz = PLACES.plaza.z;
camera.position.set(cx + Math.cos(attractAngle) * 55, 26, cz + Math.sin(attractAngle) * 55);
camera.lookAt(cx, 2, cz);
city.update(dt);
S.effects.update(dt);
renderer.render(scene, camera);
endFrameInput();
return;
}

if (S.screen === 'wasted' || S.screen === 'busted') {
incidentTimer -= dt;
if (incidentTimer <= 0) resolveIncident();
renderer.render(scene, camera);
endFrameInput();
return;
}

if (S.screen === 'pause') {
hud.update(rawDt);
renderer.render(scene, camera);
endFrameInput();
return;
}


acc += dt;
let steps = 0;
while (acc >= STEP && steps < 3) {
step(STEP);
acc -= STEP;
steps += 1;
}
if (steps === 3) acc = 0;
updateCamera(dt);
if (S.shake > 0) {
addShake(S.shake);
S.shake = 0;
}
hud.update(rawDt);
updateMap(rawDt);
updateShots();
renderer.render(scene, camera);
endFrameInput();
}

function step(dt) {

S.dayTime = (S.dayTime + dt / WORLD.dayLength) % 1;
city.update(dt);
S.effects.update(dt);

if (S.dialogue) return;
if (isMapOpen()) return;
updatePlayer(dt);
if (!S.driving) S.audio?.setEngine(0, false);
updateVehicles(dt);
updatePedestrians(dt);
updateRivals(dt);
updatePolice(dt);
updateMission(dt);
autosaveTimer += dt;
if (autosaveTimer > 25) {
autosaveTimer = 0;
saveGame();
}
}

requestAnimationFrame(frame);
